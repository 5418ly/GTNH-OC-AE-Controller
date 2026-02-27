package org.eu.smileyik.ocae.simplebackend.controller;

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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

public class SimpleObjectController extends BaseController {
    private static final TypeToken<Map<String, Object>> TYPE_TOKEN = new TypeToken<Map<String, Object>>() {};
    private static final Gson GSON = new Gson();
    private static final Gson GSON_PRETTY = new GsonBuilder().setPrettyPrinting().create();
    
    private Map<String, Object> object = new HashMap<>();
    private volatile long lastModified = System.currentTimeMillis();
    
    // 分批处理状态
    private final Map<String, BatchState> batchStates = new ConcurrentHashMap<>();
    
    // 分批状态类
    private static class BatchState {
        final AtomicInteger receivedBatches = new AtomicInteger(0);
        final AtomicInteger totalBatches = new AtomicInteger(0);
        final AtomicLong lastBatchTime = new AtomicLong(System.currentTimeMillis());
        final List<Map<String, Object>> accumulatedItems = new ArrayList<>();
        final String batchId;
        
        BatchState(String batchId) {
            this.batchId = batchId;
        }
    }

    public SimpleObjectController(String fileName) {
        super(fileName);
    }

    @GetMapping
    @ResponseBody
    public Map<String, Object> get(HttpServletRequest req, HttpServletResponse resp) {
        System.out.println("[SimpleObjectController] GET request for " + getFileName());
        
        // 暂时禁用缓存，总是返回数据
        resp.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
        resp.setHeader("Pragma", "no-cache");
        resp.setDateHeader("Expires", 0);
        
        // 打印 object 内容摘要
        if (object.containsKey("result")) {
            Object result = object.get("result");
            if (result instanceof List) {
                System.out.println("[SimpleObjectController] Returning object with result list size: " + ((List<?>) result).size());
            } else {
                System.out.println("[SimpleObjectController] Returning object with result: " + result);
            }
        } else {
            System.out.println("[SimpleObjectController] Returning object with keys: " + object.keySet());
        }
        
        return object;
    }

    @DeleteMapping
    @ResponseBody
    public Map<String, Object> delete() {
        Map<String, Object> result = object;
        object = new HashMap<>();
        lastModified = System.currentTimeMillis();
        return result;
    }

    @PutMapping
    @ResponseBody
    public Map<String, Object> put(@RequestBody Map<String, Object> requestBody, HttpServletRequest req) {
        requestBody = filter(requestBody, TYPE_TOKEN, req.getServletPath());
        
        // 检查是否是分批请求
        if (requestBody.containsKey("batch") && requestBody.containsKey("totalBatches")) {
            return handleBatchRequest(requestBody);
        }
        
        // 普通请求，直接替换
        this.object = new HashMap<>(requestBody);
        lastModified = System.currentTimeMillis();
        return this.object;
    }

    /**
     * 处理分批请求
     */
    @SuppressWarnings("unchecked")
    private Map<String, Object> handleBatchRequest(Map<String, Object> requestBody) {
        int batch = ((Number) requestBody.get("batch")).intValue();
        int totalBatches = ((Number) requestBody.get("totalBatches")).intValue();
        
        // 使用路径作为批次ID的一部分，区分不同类型的数据
        String batchId = "default";
        
        // 获取或创建批次状态
        BatchState state = batchStates.computeIfAbsent(batchId, BatchState::new);
        
        // 如果是新的批次序列（batch == 1），重置状态
        if (batch == 1) {
            state.receivedBatches.set(0);
            state.totalBatches.set(totalBatches);
            state.accumulatedItems.clear();
        }
        
        state.lastBatchTime.set(System.currentTimeMillis());
        state.totalBatches.set(totalBatches);
        
        // 累积物品数据
        Object resultObj = requestBody.get("result");
        if (resultObj instanceof List) {
            List<Map<String, Object>> items = (List<Map<String, Object>>) resultObj;
            state.accumulatedItems.addAll(items);
        }
        
        state.receivedBatches.incrementAndGet();
        
        // 检查是否所有批次都已接收
        if (state.receivedBatches.get() >= totalBatches) {
            // 所有批次已接收，合并数据
            Map<String, Object> finalResult = new HashMap<>();
            finalResult.put("result", new ArrayList<>(state.accumulatedItems));
            finalResult.put("totalItems", state.accumulatedItems.size());
            finalResult.put("batches", totalBatches);
            
            this.object = finalResult;
            lastModified = System.currentTimeMillis();
            
            // 清理状态
            state.accumulatedItems.clear();
            batchStates.remove(batchId);
            
            return this.object;
        }
        
        // 返回当前进度
        Map<String, Object> progress = new HashMap<>();
        progress.put("status", "receiving");
        progress.put("batch", batch);
        progress.put("totalBatches", totalBatches);
        progress.put("receivedBatches", state.receivedBatches.get());
        progress.put("accumulatedItems", state.accumulatedItems.size());
        
        return progress;
    }

    @PatchMapping
    @ResponseBody
    public Map<String, Object> patch(@RequestBody Map<String, Object> object, HttpServletRequest req) {
        object = filter(object, TYPE_TOKEN, req.getServletPath());

        this.object.putAll(object);
        lastModified = System.currentTimeMillis();
        return this.object;
    }

    @Override
    protected void onLoad(File file) {
        try (FileReader reader = new FileReader(file)) {
            Map<String, Object> loaded = GSON.fromJson(reader, new TypeToken<HashMap<String, Object>>() {}.getType());
            if (loaded != null) {
                object = loaded;
            }
        } catch (FileNotFoundException e) {
            // 文件不存在，使用空对象
            object = new HashMap<>();
        } catch (IOException e) {
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
                    GSON_PRETTY.toJson(object),
                    StandardCharsets.UTF_8,
                    StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING, StandardOpenOption.WRITE);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}