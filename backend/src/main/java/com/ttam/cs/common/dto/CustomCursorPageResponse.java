package com.ttam.cs.common.dto;

import java.util.List;
import java.util.UUID;

public interface CustomCursorPageResponse<T> {
    List<T> content();
    UUID nextCursor();
    boolean hasNext();
}
