import { useMemo } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = {
    'en-US': enUS,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

export default function CalendarView({ cases, date, onNavigate }) {
    // Convert your cases array into the format react-big-calendar expects
    const events = useMemo(() => {
        return cases.map((c) => ({
            id: c.id,
            title: `${c.client_name} (${c.case_number})`,
            start: new Date(c.next_hearing_date),
            end: new Date(c.next_hearing_date),
            allDay: true,
            resource: c,
        }));
    }, [cases]);

    return (
        <div className="bg-white rounded-xl shadow overflow-hidden border border-slate-200 p-4" style={{ height: '650px' }}>
            <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                defaultView="month"
                views={['month', 'agenda']}
                date={date} // Controlled date from dashboard
                onNavigate={onNavigate} // Handles internal calendar prev/next clicks too
                className="font-sans"
            />
        </div>
    );
}