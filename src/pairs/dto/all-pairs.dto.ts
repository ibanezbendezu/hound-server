import { RepositoryDTO } from './pair-by-id.dto';

export interface AllPairsDTO {
    id: number;
    similarity: number;
    leftFileSha: string;
    rightFileSha: string;
    files: {
        repository: RepositoryDTO;
    }[];
    fragments: {
        id: number;
        leftstartRow: number;
        leftendRow: number;
        rightstartRow: number;
        rightendRow: number;
        pairId: number;
    }[];
}
