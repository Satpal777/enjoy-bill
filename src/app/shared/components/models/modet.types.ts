export interface Group {
    id: string;
    name: string;
    created_at: string;
    description?: string;
    member_count: number;
}

export interface GroupDetails extends Group {
    members?: Member[];
    expenses?: Expense[];
    invites?: Invitation[];
}

export interface Member {
    id: string;
    name: string;
    avatar_url?: string;
    invitee_email?: string;
    joined_at?: string;
}

export interface MemberWithBalance extends Member {
    balanceAmount: number;
    initials: string;
}

export interface Balance {
    user_id: string;
    person: string;
    member_name: string;
    avatar_url: string;
    balance: number;
}

export interface GlobalBalance {
    you_owe: number;
    owed_to_you: number;
}

export interface Expense {
    id: string;
    title: string;
    amount: number;
    currency: string;
    date: Date;
    paidBy: string;
    payerId: string;
    category: string;
    isLent: boolean;
    myShare: number;
}

export interface ExpenseDbPayload {
    group_id: string;
    description: string;
    total_amount: number;
    currency: string;
    category: string;
    paid_by: string;
    expense_date: string | Date;
}

export interface ExpenseFromDb {
    id: string;
    description: string;
    total_amount: number;
    currency: string;
    category: string;
    expense_date: string;
    payer: {
        id: string;
        display_name: string;
    };
    my_split: Array<{
        amount_owed: number;
    }>;
}

export type ExpenseCategory =
    | 'Food'
    | 'Transport'
    | 'Housing'
    | 'Entertainment'
    | 'Utilities'
    | 'Other';

export type Currency = 'USD' | 'EUR' | 'INR' | 'GBP';

export interface Invitation {
    id: string;
    created_at: string;
    expires_at?: string;
    group_name: string;
    inviter_name: string;
}

export interface InvitationResponse {
    id: string;
    accept: boolean;
}

export interface User {
    id: string;
    email: string;
    display_name?: string;
    avatar_url?: string;
    created_at: string;
}

export interface UserProfile extends User {
    phone?: string;
    bio?: string;
    preferences?: UserPreferences;
}

export interface UserPreferences {
    theme: 'light' | 'dark';
    defaultCurrency: Currency;
    notifications: boolean;
}

export interface FormField {
    name: string;
    label: string;
    type: 'text' | 'email' | 'password' | 'number' | 'date' | 'select' | 'textarea';
    placeholder?: string;
    required?: boolean;
    validators?: any[];
    options?: SelectOption[];
}

export interface SelectOption {
    value: string | number;
    label: string;
    icon?: string;
}

export interface FilterOption {
    value: string;
    label: string;
    count?: number;
}

export type ExpenseFilter = 'all' | 'my' | 'to_pay';

export interface ApiResponse<T> {
    data: T;
    error: null | ApiError;
    success: boolean;
}

export interface ApiError {
    message: string;
    code?: string;
    details?: any;
}

export interface PaginatedResponse<T> {
    data: T[];
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
}
