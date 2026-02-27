package org.eu.smileyik.ocae.simplebackend.controller;

import com.github.houbb.sensitive.word.bs.SensitiveWordBs;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.StandardOpenOption;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

public class SimpleArrayController extends BaseController {
    private static final TypeToken<Map<String, Object>> TYPE_TOKEN = new TypeToken<Map<String, Object>>() {};
    private static final Gson GSON = new Gson();
    private static final Gson GSON_PRETTY = new GsonBuilder().setPrettyPrinting().create();
    
    private List<Map<String, Object>> array = new ArrayList<>();
    private final Map<String, Long> elementLastModified = new ConcurrentHashMap<>();
    private volatile long lastModified = System.currentTimeMillis();

    public SimpleArrayController(String fileName) {
        super(fileName);
    }

    @GetMapping
    @ResponseBody
    public List<Map<String, Object>> get(HttpServletRequest req, HttpServletResponse resp) {
        System.out.println("[SimpleArrayController] GET request for " + getFileName() + ", array size: " + array.size());
        
        // 打印数组内容摘要
        for (int i = 0; i < Math.min(3, array.size()); i++) {
            Map<String, Object> item = array.get(i);
            System.out.println("[SimpleArrayController] Item " + i + ": id=" + item.get("id") + ", busy=" + item.get("busy"));
        }
        
        // 暂时禁用缓存，总是返回数据
        resp.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
        resp.setHeader("Pragma", "no-cache");
        resp.setDateHeader("Expires", 0);
        
        System.out.println("[SimpleArrayController] Returning array with " + array.size() + " items");
        return array;
    }

    @PostMapping
    @ResponseBody
    public Map<String, Object> post(@RequestBody Map<String, Object> request, HttpServletRequest req, HttpServletResponse resp) {
        request = filter(request, TYPE_TOKEN, req.getServletPath());

        array.add(request);
        if (!request.containsKey("id")) {
            request.put("id", array.size() - 1);
        }
        updateLastModified();
        resp.setStatus(HttpServletResponse.SC_CREATED);
        return request;
    }

    @GetMapping("/{id}")
    @ResponseBody
    public Map<String, Object> get(@PathVariable("id") String id, HttpServletRequest req, HttpServletResponse response) {
        Map<String, Object> result = findById(id);

        if (result == null) {
            response.setStatus(HttpServletResponse.SC_NOT_FOUND);
            return null;
        }
        
        // 检查单个元素的时间戳（如果启用）
        String elementId = String.valueOf(result.get("id"));
        Long elementModified = elementLastModified.get(elementId);
        long checkTimestamp = elementModified != null ? elementModified : lastModified;
        
        long timestamp = req.getDateHeader("If-Modified-Since");
        if (checkTimestamp <= timestamp) {
            response.setStatus(HttpServletResponse.SC_NOT_MODIFIED);
            return null;
        }

        response.setDateHeader("Last-Modified", checkTimestamp + 1000);
        response.setHeader("Cache-Control", "no-cache, must-revalidate");
        return result;
    }

    @PutMapping("/{id}")
    @ResponseBody
    public Map<String, Object> put(@PathVariable("id") String id,
                                   @RequestBody Map<String, Object> request,
                                   HttpServletRequest req,
                                   HttpServletResponse response) {
        System.out.println("[SimpleArrayController] PUT request for " + getFileName() + "/" + id);
        System.out.println("[SimpleArrayController] Request body: id=" + request.get("id") + ", busy=" + request.get("busy"));
        
        request = filter(request, TYPE_TOKEN, req.getServletPath());
        
        // 确保 request 中有 id 字段
        if (!request.containsKey("id")) {
            request.put("id", id);
        }
        
        // 首先尝试通过 id 字段查找
        int index = -1;
        for (int i = 0; i < array.size(); i++) {
            Map<String, Object> map = array.get(i);
            if (map.containsKey("id") && Objects.equals(String.valueOf(map.get("id")), id)) {
                index = i;
                break;
            }
        }
        
        // 如果找到了，更新现有记录
        if (index != -1) {
            System.out.println("[SimpleArrayController] Updating existing CPU at index " + index);
            array.set(index, request);
        } else {
            // 如果没找到，创建新记录 (upsert 行为)
            System.out.println("[SimpleArrayController] Creating new CPU, current array size: " + array.size());
            array.add(request);
            index = array.size() - 1;
        }
        
        updateLastModified();
        
        // 更新单个元素的时间戳
        String elementId = String.valueOf(request.get("id"));
        elementLastModified.put(elementId, System.currentTimeMillis());
        
        System.out.println("[SimpleArrayController] After PUT, array size: " + array.size());
        
        // 保存到文件
        store();
        
        return array.get(index);
    }

    @DeleteMapping("/{id}")
    @ResponseBody
    public Map<String, Object> delete(@PathVariable("id") String id, HttpServletResponse response) {
        int index = -1;
        Map<String, Object> result = null;
        
        // 首先尝试通过索引查找
        try {
            int idx = Integer.parseInt(id);
            if (idx >= 0 && idx < array.size()) {
                Map<String, Object> existing = array.get(idx);
                if (existing != null && Objects.equals(String.valueOf(existing.get("id")), id)) {
                    index = idx;
                    result = existing;
                }
            }
        } catch (NumberFormatException ignored) {
            // ID 不是数字，通过 id 字段查找
        }
        
        // 如果通过索引没找到，通过 id 字段查找
        if (index == -1) {
            for (int i = array.size() - 1; i >= 0; i--) {
                Map<String, Object> map = array.get(i);
                if (map.containsKey("id") && Objects.equals(String.valueOf(map.get("id")), id)) {
                    index = i;
                    result = map;
                    break;
                }
            }
        }
        
        if (index == -1 || result == null) {
            response.setStatus(HttpServletResponse.SC_NOT_FOUND);
            return null;
        }
        
        array.remove(index);
        elementLastModified.remove(String.valueOf(result.get("id")));
        updateLastModified();
        
        return result;
    }

    /**
     * 查找指定 ID 的元素
     */
    private Map<String, Object> findById(String id) {
        // 首先尝试通过 id 字段查找
        for (Map<String, Object> item : array) {
            if (item.containsKey("id") && Objects.equals(String.valueOf(item.get("id")), id)) {
                return item;
            }
        }
        
        // 如果没找到，尝试通过索引查找
        try {
            int idx = Integer.parseInt(id);
            if (idx >= 0 && idx < array.size()) {
                return array.get(idx);
            }
        } catch (NumberFormatException ignored) {
            // ID 不是数字
        }
        
        return null;
    }

    /**
     * 更新最后修改时间
     */
    private void updateLastModified() {
        lastModified = System.currentTimeMillis();
    }

    @Override
    protected void onLoad(File file) {
        System.out.println("[SimpleArrayController] Loading from file: " + file.getAbsolutePath());
        try (FileReader reader = new FileReader(file)) {
            List<Map<String, Object>> loaded = GSON.fromJson(reader, new TypeToken<ArrayList<Map<String, Object>>>() {}.getType());
            if (loaded != null) {
                array = loaded;
                System.out.println("[SimpleArrayController] Loaded " + array.size() + " items from file");
                // 初始化所有元素的时间戳
                for (Map<String, Object> item : array) {
                    if (item.containsKey("id")) {
                        elementLastModified.put(String.valueOf(item.get("id")), lastModified);
                    }
                }
            }
        } catch (FileNotFoundException e) {
            // 文件不存在，使用空数组
            System.out.println("[SimpleArrayController] File not found, using empty array");
            array = new ArrayList<>();
        } catch (IOException e) {
            System.out.println("[SimpleArrayController] Error loading file: " + e.getMessage());
            e.printStackTrace();
        }
    }

    @Override
    protected void onStore(File file) {
        try {
            File parentFile = file.getParentFile();
            if (parentFile != null && !parentFile.exists()) {
                parentFile.mkdirs();
            }
            Files.writeString(
                    file.toPath(),
                    GSON_PRETTY.toJson(array),
                    StandardCharsets.UTF_8,
                    StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING, StandardOpenOption.WRITE);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}