package org.eu.smileyik.ocae.simplebackend.model;

import jakarta.persistence.*;

@MappedSuperclass
public class BaseStorageFluid {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String label;
    private Boolean isCraftable;
    private Long amount;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }
    public Boolean getIsCraftable() { return isCraftable; }
    public void setIsCraftable(Boolean craftable) { isCraftable = craftable; }
    public Long getAmount() { return amount; }
    public void setAmount(Long amount) { this.amount = amount; }
}
