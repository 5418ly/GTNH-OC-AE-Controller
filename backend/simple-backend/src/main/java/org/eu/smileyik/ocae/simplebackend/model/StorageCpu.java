package org.eu.smileyik.ocae.simplebackend.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import java.util.Map;

@Entity
@Table(name = "storage_cpus", indexes = {
    @Index(name = "idx_cpu_id", columnList = "id")
})
public class StorageCpu {
    @Id
    @Column(length = 64)
    private String id; // CPU ID

    private Boolean busy;
    private Long storage;
    private Long coprocessors;
    
    @Lob
    @Column(columnDefinition = "CLOB") 
    private String cpuData; 

    @Transient
    @JsonProperty("cpu")
    private Map<String, Object> cpuInput;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public Boolean getBusy() { return busy; }
    public void setBusy(Boolean busy) { this.busy = busy; }
    public Long getStorage() { return storage; }
    public void setStorage(Long storage) { this.storage = storage; }
    public Long getCoprocessors() { return coprocessors; }
    public void setCoprocessors(Long coprocessors) { this.coprocessors = coprocessors; }
    
    public String getCpuData() { return cpuData; }
    public void setCpuData(String cpuData) { this.cpuData = cpuData; }

    public Map<String, Object> getCpuInput() { return cpuInput; }
    public void setCpuInput(Map<String, Object> cpuInput) { this.cpuInput = cpuInput; }
}
