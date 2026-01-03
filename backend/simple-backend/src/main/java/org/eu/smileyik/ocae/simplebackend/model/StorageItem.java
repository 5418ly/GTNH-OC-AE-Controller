package org.eu.smileyik.ocae.simplebackend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "storage_items", indexes = {
    @Index(name = "idx_item_name", columnList = "name"),
    @Index(name = "idx_item_label", columnList = "label")
})
public class StorageItem extends BaseStorageItem {
}