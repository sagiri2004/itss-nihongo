package com.itss_nihongo.backend.common.converter;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.util.StringUtils;

@Converter
public class StringListJsonConverter implements AttributeConverter<List<String>, String> {

    private static final Logger log = LoggerFactory.getLogger(StringListJsonConverter.class);
    private static final ObjectMapper objectMapper = new ObjectMapper();
    private static final TypeReference<List<String>> TYPE_REFERENCE = new TypeReference<>() { };

    @Override
    public String convertToDatabaseColumn(List<String> attribute) {
        if (attribute == null || attribute.isEmpty()) {
            return "[]";
        }

        try {
            return objectMapper.writeValueAsString(attribute);
        } catch (JsonProcessingException ex) {
            log.warn("Failed to serialize list attribute to JSON. Returning empty array. Error: {}", ex.getMessage());
            return "[]";
        }
    }

    @Override
    public List<String> convertToEntityAttribute(String dbData) {
        if (!StringUtils.hasText(dbData)) {
            return new ArrayList<>();
        }

        try {
            return objectMapper.readValue(dbData, TYPE_REFERENCE);
        } catch (JsonProcessingException ex) {
            log.warn("Failed to deserialize JSON to list attribute. Returning empty list. Error: {}", ex.getMessage());
            return new ArrayList<>();
        }
    }
}


