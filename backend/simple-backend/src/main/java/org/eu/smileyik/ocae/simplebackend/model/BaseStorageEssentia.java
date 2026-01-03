package org.eu.smileyik.ocae.simplebackend.model;

import jakarta.persistence.*;

@MappedSuperclass
public class BaseStorageEssentia {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String label;
    private Long amount;
    private String aspect;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }
    public Long getAmount() { return amount; }
    public void setAmount(Long amount) { this.amount = amount; }
    public String getAspect() { return aspect; }
    public void setAspect(String aspect) { this.aspect = aspect; }
}
