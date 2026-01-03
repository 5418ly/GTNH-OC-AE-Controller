package org.eu.smileyik.ocae.simplebackend.model;

import jakarta.persistence.*;

@MappedSuperclass
public class BaseStorageItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String label;
    private Boolean isCraftable;
    private Long damage;
    private Long size;
    @Column(length = 1024)
    private String aspect;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }
    public Boolean getIsCraftable() { return isCraftable; }
    public void setIsCraftable(Boolean craftable) { isCraftable = craftable; }
    public Long getDamage() { return damage; }
    public void setDamage(Long damage) { this.damage = damage; }
    public Long getSize() { return size; }
    public void setSize(Long size) { this.size = size; }
    public String getAspect() { return aspect; }
    public void setAspect(String aspect) { this.aspect = aspect; }
}
