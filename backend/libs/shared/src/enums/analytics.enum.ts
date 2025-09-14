export enum AnalyticsEventType {
    VIEW = 'view',
    INTERACTION = 'interaction',
    CONVERSION = 'conversion',
    ERROR = 'error',
    CLICK = 'click',
    SCROLL = 'scroll',
    FORM_SUBMIT = 'form_submit',
    SESSION_START = 'session_start',
    SESSION_END = 'session_end',
}

export enum AnalyticsTimeRange {
    HOUR = 'hour',
    DAY = 'day',
    WEEK = 'week',
    MONTH = 'month',
    QUARTER = 'quarter',
    YEAR = 'year',
}

export enum AnalyticsGroupBy {
    HOUR = 'hour',
    DAY = 'day',
    WEEK = 'week',
    MONTH = 'month',
    USER = 'user',
    SESSION = 'session',
    DEVICE = 'device',
    BROWSER = 'browser',
    COUNTRY = 'country',
}
