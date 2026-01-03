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
    private StorageFluidRepository fluidRepository;
    @Autowired
    private StorageEssentiaRepository essentiaRepository;
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
    @PostMapping("/items/batch")
    public void addItems(@RequestBody List<StorageItem> items) {
        itemRepository.saveAll(items);
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
    @PostMapping("/fluids/batch")
    public void addFluids(@RequestBody List<StorageFluid> fluids) {
        fluidRepository.saveAll(fluids);
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
    @PostMapping("/essentia/batch")
    public void addEssentia(@RequestBody List<StorageEssentia> essentia) {
        essentiaRepository.saveAll(essentia);
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
