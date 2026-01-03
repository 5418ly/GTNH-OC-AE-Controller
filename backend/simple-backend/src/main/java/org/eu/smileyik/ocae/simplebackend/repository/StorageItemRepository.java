package org.eu.smileyik.ocae.simplebackend.repository;

import org.eu.smileyik.ocae.simplebackend.model.StorageItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StorageItemRepository extends JpaRepository<StorageItem, Long> {
}
