import { Fragment } from "./dolos/core/algorithm/fragment";

export type User = {
    id: number;
    githubId: number;
    name: string;
    githubToken: string;
}

export type Comparison = {
    id: number;
    similarity: number;
    comparisonDate: Date;
    repositoryAId: number;
    repositoryBId: number;
    repositoryA: Repository;
    repositoryB: Repository;
}

export type Repository = {
    id: number;
    githubId: number;
    owner: string;
    name: string;
    totalLines: number;
    comparisonsA: Comparison[];
    comparisonsB: Comparison[];
    pairs: Pair[];
}

export type Pair = {
    id: number;
    dolosId: string;
    similarity: number;
    leftFilepath: string;
    charCountLeft: number;
    lineCountLeft: number;
    rightFilepath: string;
    charCountRight: number;
    lineCountRight: number;
    fragments: Frag[];
    repositoryId: number;
    repository: Repository;
}

export type Frag = {
    id: number;
    leftstartRow: number;
    leftendRow: number;
    leftstartCol: number;
    leftendCol: number;
    rightstartRow: number;
    rightendRow: number;
    rightstartCol: number;
    rightendCol: number;
    parId: number;
    par: Pair;
}


export type FileString = {
    path: string;
    content: string;
}