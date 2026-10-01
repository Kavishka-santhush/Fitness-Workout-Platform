'use client';
import * as React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { PageHeader } from '@/components/common';
import { Card, CardContent } from '@/components/ui/card';
import { useScheduleWeek } from '@/lib/hooks';

export default function SchedulePage() {
  const { data } = useScheduleWeek();
  const events = React.useMemo(() => {
    const items: any[] = (data as any)?.items ?? (Array.isArray(data) ? data : []);
    return items.map((e) => ({
      id: e.id,
      title: e.title ?? e.workout?.name ?? 'Event',
      start: e.startAt ?? e.date,
      end: e.endAt,
      extendedProps: e,
    }));
  }, [data]);

  return (
    <div>
      <PageHeader title="Schedule" subtitle="Your upcoming training plan and appointments." />
      <Card>
        <CardContent className="p-4 [&_.fc-toolbar-title]:text-lg [&_.fc-button-primary]:bg-primary [&_.fc-button-primary]:border-primary">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
            events={events}
            height={720}
            editable
            dayMaxEvents
          />
        </CardContent>
      </Card>
    </div>
  );
}
