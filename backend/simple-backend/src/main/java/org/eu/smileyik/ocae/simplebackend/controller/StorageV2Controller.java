package org.eu.smileyik.ocae.simplebackend.controller;

import org.eu.smileyik.ocae.simplebackend.model.*;
import org.eu.smileyik.ocae.simplebackend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v2")
public class StorageV2Controller {

    @Autowired
    private StorageItemRepository itemRepository;
    @Autowired
    private StorageItemTempRepository itemTempRepository;
    @Autowired
    private StorageFluidRepository fluidRepository;
    @Autowired
    private StorageFluidTempRepository fluidTempRepository;
    @Autowired
    private StorageEssentiaRepository essentiaRepository;
    @Autowired
    private StorageEssentiaTempRepository essentiaTempRepository;
    @Autowired
    private StorageCpuRepository cpuRepository;

    private final com.google.gson.Gson gson = new com.google.gson.Gson();

    // --- Items ---

    @Transactional
    @DeleteMapping("/items")
    public void clearItems() {
        itemRepository.deleteAll();
    }

    @Transactional
    @DeleteMapping("/items/temp")
    public void clearItemsTemp() {
        itemTempRepository.deleteAll();
    }

    @Transactional
    @PostMapping("/items/batch")
    public void addItems(@RequestBody List<StorageItemTemp> items) {
        itemTempRepository.saveAll(items);
    }

    @Transactional
    @PostMapping("/items/commit")
    public void commitItems() {
        List<StorageItem> newItems = itemTempRepository.findAll().stream().map(temp -> {
            StorageItem item = new StorageItem();
            item.setName(temp.getName());
            item.setLabel(temp.getLabel());
            item.setIsCraftable(temp.getIsCraftable());
            item.setDamage(temp.getDamage());
            item.setSize(temp.getSize());
            item.setAspect(temp.getAspect());
            return item;
        }).toList();
        itemRepository.deleteAll();
        itemRepository.saveAll(newItems);
        itemTempRepository.deleteAll();
    }

    @GetMapping("/items")
    public Page<StorageItem> getItems(Pageable pageable) {
        return itemRepository.findAll(pageable);
    }

    // --- Fluids ---

    @Transactional
    @DeleteMapping("/fluids")
    public void clearFluids() {
        fluidRepository.deleteAll();
    }
    
    @Transactional
    @DeleteMapping("/fluids/temp")
    public void clearFluidsTemp() {
        fluidTempRepository.deleteAll();
    }

    @Transactional
    @PostMapping("/fluids/batch")
    public void addFluids(@RequestBody List<StorageFluidTemp> fluids) {
        fluidTempRepository.saveAll(fluids);
    }

    @Transactional
    @PostMapping("/fluids/commit")
    public void commitFluids() {
        List<StorageFluid> newItems = fluidTempRepository.findAll().stream().map(temp -> {
            StorageFluid item = new StorageFluid();
            item.setName(temp.getName());
            item.setLabel(temp.getLabel());
            item.setIsCraftable(temp.getIsCraftable());
            item.setAmount(temp.getAmount());
            return item;
        }).toList();
        fluidRepository.deleteAll();
        fluidRepository.saveAll(newItems);
        fluidTempRepository.deleteAll();
    }

    @GetMapping("/fluids")
    public Page<StorageFluid> getFluids(Pageable pageable) {
        return fluidRepository.findAll(pageable);
    }

    // --- Essentia ---

    @Transactional
    @DeleteMapping("/essentia")
    public void clearEssentia() {
        essentiaRepository.deleteAll();
    }

    @Transactional
    @DeleteMapping("/essentia/temp")
    public void clearEssentiaTemp() {
        essentiaTempRepository.deleteAll();
    }

    @Transactional
    @PostMapping("/essentia/batch")
    public void addEssentia(@RequestBody List<StorageEssentiaTemp> essentia) {
        essentiaTempRepository.saveAll(essentia);
    }
    
    @Transactional
    @PostMapping("/essentia/commit")
    public void commitEssentia() {
        List<StorageEssentia> newItems = essentiaTempRepository.findAll().stream().map(temp -> {
            StorageEssentia item = new StorageEssentia();
            item.setName(temp.getName());
            item.setLabel(temp.getLabel());
            item.setAmount(temp.getAmount());
            item.setAspect(temp.getAspect());
            return item;
        }).toList();
        essentiaRepository.deleteAll();
        essentiaRepository.saveAll(newItems);
        essentiaTempRepository.deleteAll();
    }

    @GetMapping("/essentia")
    public Page<StorageEssentia> getEssentia(Pageable pageable) {
        return essentiaRepository.findAll(pageable);
    }

    // --- CPUs ---

    @Transactional
    @PostMapping("/cpus/batch")
    public void addCpus(@RequestBody List<StorageCpu> cpus) {
        for (StorageCpu cpu : cpus) {
            if (cpu.getCpuInput() != null) {
                // Full update with details
                cpu.setCpuData(gson.toJson(cpu.getCpuInput()));
            } else {
                // Partial update (status only), preserve existing details
                cpuRepository.findById(cpu.getId()).ifPresent(existing -> {
                    cpu.setCpuData(existing.getCpuData());
                });
            }
        }
        cpuRepository.saveAll(cpus);
    }

    @GetMapping("/cpus")
    public List<StorageCpu> getCpus() {
        List<StorageCpu> list = cpuRepository.findAll();
        list.forEach(cpu -> {
            if (cpu.getCpuData() != null) {
                try {
                    cpu.setCpuInput(gson.fromJson(cpu.getCpuData(), java.util.Map.class));
                } catch (Exception e) {
                    // ignore parse error
                }
            }
        });
        return list;
    }
}
