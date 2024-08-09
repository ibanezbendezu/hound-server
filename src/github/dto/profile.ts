import { RepositoryDto } from './repository';

export class ProfileDto {
    created_at: string;
    html_url: string;
    avatar_url: string;
    login: string;
    name: string;
    bio: string;
    public_repos: number;
    followers: number;
    following: number;
    location: string;
    email: string;
    twitter_username?: string | null;
}