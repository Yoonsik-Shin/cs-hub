package com.ttam.cs.common.dto;

import java.util.List;
import java.util.UUID;
import java.util.function.Function;

public record CursorPage<T>(
        List<T> content,
        UUID nextCursor,
        boolean hasNext) {
    public static <T> CursorPage<T> of(List<T> searchResult, int size, Function<T, UUID> idExtractor) {
        boolean hasNext = searchResult.size() > size;
        List<T> content = hasNext ? searchResult.subList(0, size) : searchResult;
        UUID nextCursor = hasNext && !content.isEmpty() ? idExtractor.apply(content.get(content.size() - 1)) : null;
        return new CursorPage<>(content, nextCursor, hasNext);
    }

    public <U> CursorPage<U> map(Function<? super T, U> converter) {
        List<U> mappedContent = this.content.stream().map(converter).toList();
        return new CursorPage<>(mappedContent, this.nextCursor, this.hasNext);
    }
}
