import type { ColumnType } from "kysely";
export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export type account = {
    id: Generated<number>;
    username: string;
    password: string;
    password_updated: string | null;
    email: string | null;
    oauth_provider: string | null;
    registration_ip: string | null;
    registration_date: Generated<string>;
    logged_in: Generated<number>;
    login_time: string | null;
    logged_out: Generated<number>;
    logout_time: string | null;
    muted_until: string | null;
    banned_until: string | null;
    staffmodlevel: Generated<number>;
    notes: string | null;
    notes_updated: string | null;
    members: Generated<number>;
    tfa_enabled: Generated<number>;
    tfa_last_code: Generated<number>;
    tfa_secret_base32: string | null;
    tfa_incorrect_attempts: Generated<number>;
};
export type account_session = {
    id: Generated<number>;
    account_id: number;
    world: Generated<number>;
    profile: Generated<string>;
    session_uuid: string;
    timestamp: string;
    coord: number;
    event: string;
    event_type: Generated<number>;
};
export type account_tag = {
    tag_id: number;
    account_id: number;
};
export type friendlist = {
    account_id: number;
    friend_account_id: number;
    created: Generated<string>;
};
export type hiscore = {
    profile: Generated<string>;
    account_id: number;
    type: number;
    level: number;
    value: number;
    date: Generated<string>;
};
export type hiscore_large = {
    profile: Generated<string>;
    account_id: number;
    type: number;
    level: number;
    value: number;
    date: Generated<string>;
};
export type ignorelist = {
    account_id: number;
    value: string;
    created: Generated<string>;
};
export type input_report = {
    id: Generated<number>;
    account_id: number;
    timestamp: string;
    session_uuid: string;
};
export type input_report_event_raw = {
    input_report_id: number;
    seq: number;
    coord: number;
    data: Buffer;
};
export type ipban = {
    ip: string;
};
export type login = {
    uuid: string;
    account_id: number;
    world: number;
    timestamp: string;
    uid: number;
    ip: string | null;
};
export type message = {
    id: Generated<number>;
    thread_id: number;
    sender_id: number;
    sender_ip: string;
    content: string;
    created: Generated<string>;
    edited: string | null;
    edited_by: number | null;
    deleted: string | null;
    deleted_by: number | null;
};
export type message_status = {
    id: Generated<number>;
    thread_id: number;
    account_id: number;
    read: string | null;
    deleted: string | null;
};
export type message_tag = {
    tag_id: number;
    thread_id: number;
};
export type message_thread = {
    id: Generated<number>;
    to_account_id: number | null;
    from_account_id: number;
    last_message_from: number;
    subject: string;
    created: Generated<string>;
    updated: Generated<string>;
    messages: Generated<number>;
    closed: string | null;
    closed_by: number | null;
    marked_spam: string | null;
    marked_spam_by: number | null;
};
export type mod_action = {
    id: Generated<number>;
    account_id: number;
    target_id: number | null;
    action_id: number;
    data: string | null;
    ip: string | null;
    timestamp: Generated<string>;
};
export type newspost = {
    id: Generated<number>;
    category: number;
    title: string;
    content: string;
    slug: string | null;
    created: Generated<string>;
    updated: Generated<string>;
};
export type private_chat = {
    id: Generated<number>;
    account_id: number;
    profile: string;
    timestamp: string;
    coord: number;
    to_account_id: number;
    message: string;
};
export type public_chat = {
    id: Generated<number>;
    account_id: number;
    profile: string;
    world: number;
    timestamp: string;
    coord: number;
    message: string;
};
export type report = {
    id: Generated<number>;
    account_id: number;
    profile: string;
    world: number;
    timestamp: string;
    coord: number;
    offender: string;
    reason: number;
    reviewed: Generated<number>;
};
export type session = {
    uuid: string;
    account_id: number;
    profile: string;
    world: number;
    timestamp: string;
    uid: number;
    ip: string | null;
};
export type tag = {
    id: Generated<number>;
    name: string;
    color: string | null;
};
export type wealth_event = {
    id: Generated<number>;
    timestamp: string;
    coord: number;
    world: Generated<number>;
    profile: Generated<string>;
    event_type: Generated<number>;
    account_id: number;
    account_session: string;
    account_items: string;
    account_value: number;
    recipient_id: number | null;
    recipient_session: string | null;
    recipient_items: string | null;
    recipient_value: number | null;
};
export type DB = {
    account: account;
    account_session: account_session;
    account_tag: account_tag;
    friendlist: friendlist;
    hiscore: hiscore;
    hiscore_large: hiscore_large;
    ignorelist: ignorelist;
    input_report: input_report;
    input_report_event_raw: input_report_event_raw;
    ipban: ipban;
    login: login;
    message: message;
    message_status: message_status;
    message_tag: message_tag;
    message_thread: message_thread;
    mod_action: mod_action;
    newspost: newspost;
    private_chat: private_chat;
    public_chat: public_chat;
    report: report;
    session: session;
    tag: tag;
    wealth_event: wealth_event;
};
