package org.eu.smileyik.ocae.simplebackend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "storage_items_temp", indexes = {
    @Index(name = "idx_item_temp_name", columnList = "name")
})
public class StorageItemTemp extends BaseStorageItem {
}
