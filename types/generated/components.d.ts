import type { Schema, Struct } from '@strapi/strapi';

export interface SharedAgendaItem extends Struct.ComponentSchema {
  collectionName: 'components_shared_agenda_items';
  info: {
    displayName: 'Agenda item';
    icon: 'clock';
  };
  attributes: {
    description: Schema.Attribute.Text;
    time: Schema.Attribute.String;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedCourseSession extends Struct.ComponentSchema {
  collectionName: 'components_shared_course_sessions';
  info: {
    displayName: 'Course session';
    icon: 'calendar';
  };
  attributes: {
    date: Schema.Attribute.Date & Schema.Attribute.Required;
    endTime: Schema.Attribute.String & Schema.Attribute.Required;
    sessionId: Schema.Attribute.String & Schema.Attribute.Required;
    startTime: Schema.Attribute.String & Schema.Attribute.Required;
    title: Schema.Attribute.String;
  };
}

export interface SharedLinkItem extends Struct.ComponentSchema {
  collectionName: 'components_shared_link_items';
  info: {
    displayName: 'Link item';
    icon: 'link';
  };
  attributes: {
    source: Schema.Attribute.String;
    title: Schema.Attribute.String & Schema.Attribute.Required;
    url: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export namespace Public {
    export interface ComponentSchemas {
      'shared.agenda-item': SharedAgendaItem;
      'shared.course-session': SharedCourseSession;
      'shared.link-item': SharedLinkItem;
    }
  }
}
