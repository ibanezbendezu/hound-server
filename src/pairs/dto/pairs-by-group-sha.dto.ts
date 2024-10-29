import { FileWithFragmentsDTO, FragmentDTO } from './pair-by-id.dto';

export interface PairContentDTO {
    id: number;
    similarity: number;
    totalOverlap: number;
    longestFragment: number;
    normalizedImpact: number;
    sideFragments: FragmentDTO[];
    file: FileWithFragmentsDTO;
}

export interface RepositoryGroupDTO {
    name: string;
    id: number;
    pairs: PairContentDTO[];
}

export interface PairsByGroupShaDTO {
    file: {
        id: number;
        sha: string;
        type: string;
        averageSimilarity: number;
        fragments: FragmentDTO[];
    };
    repositories: RepositoryGroupDTO[];
}
