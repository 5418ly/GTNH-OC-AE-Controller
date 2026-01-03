package org.eu.smileyik.ocae.simplebackend.repository;

import org.eu.smileyik.ocae.simplebackend.model.StorageFluid;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StorageFluidRepository extends JpaRepository<StorageFluid, Long> {
}
