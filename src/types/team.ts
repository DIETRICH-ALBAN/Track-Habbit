export type MemberRole = 'owner' | 'admin' | 'member';

export interface Team {
    id: string;
    name: string;
    created_by: string;
    created_at: string;
}

export interface Membership {
    id: string;
    team_id: string;
    user_id: string;
    role: MemberRole;
    created_at: string;
    // Joined data
    team?: Team;
    user_email?: string;
}

export interface TeamWithMembers extends Team {
    members: Membership[];
    member_count?: number;
}

export interface CreateTeamInput {
    name: string;
}

export interface InviteMemberInput {
    team_id: string;
    email: string;
    role?: MemberRole;
}
