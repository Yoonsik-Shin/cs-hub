package com.ttam.cs.feature.inquiry.usecase;

import com.ttam.cs.feature.inquiry.domain.vo.OperatorInfo;

@FunctionalInterface
public interface SystemOperatorProvider {

    OperatorInfo getOperator();
}
