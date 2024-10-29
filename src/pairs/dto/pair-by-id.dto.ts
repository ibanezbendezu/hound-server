export interface RepositoryDTO {
    name: string;
    owner: string;
    sha: string;
}

export interface FileWithFragmentsDTO {
    id: number;
    sha: string;
    type: string;
    repository: RepositoryDTO;
    fragments: FragmentDTO[];
}

export interface FragmentDTO {
    start: number;
    end: number;
}

export interface PairByIdDTO {
    id: number;
    similarity: number;
    file1: FileWithFragmentsDTO;
    file2: FileWithFragmentsDTO;
}
