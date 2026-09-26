export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      animal_categories: {
        Row: {
          allowed_sexes: Database["public"]["Enums"]["animal_sex"][];
          groups_by_birth_year: boolean;
          id: string;
          key: string;
          label_plural: string;
          label_singular: string;
          path_segment: string;
          sort_order: number;
          species: Database["public"]["Enums"]["species"];
        };
        Insert: {
          allowed_sexes: Database["public"]["Enums"]["animal_sex"][];
          groups_by_birth_year?: boolean;
          id: string;
          key: string;
          label_plural: string;
          label_singular: string;
          path_segment: string;
          sort_order: number;
          species: Database["public"]["Enums"]["species"];
        };
        Update: {
          allowed_sexes?: Database["public"]["Enums"]["animal_sex"][];
          groups_by_birth_year?: boolean;
          id?: string;
          key?: string;
          label_plural?: string;
          label_singular?: string;
          path_segment?: string;
          sort_order?: number;
          species?: Database["public"]["Enums"]["species"];
        };
        Relationships: [];
      };
      animal_facts: {
        Row: {
          animal_id: string;
          id: string;
          label: string;
          ranch_id: string;
          sort_order: number;
          value: string;
        };
        Insert: {
          animal_id: string;
          id?: string;
          label: string;
          ranch_id: string;
          sort_order?: number;
          value: string;
        };
        Update: {
          animal_id?: string;
          id?: string;
          label?: string;
          ranch_id?: string;
          sort_order?: number;
          value?: string;
        };
        Relationships: [
          {
            foreignKeyName: "animal_facts_ranch_id_animal_id_fkey";
            columns: ["ranch_id", "animal_id"];
            isOneToOne: false;
            referencedRelation: "animals";
            referencedColumns: ["ranch_id", "id"];
          },
          {
            foreignKeyName: "animal_facts_ranch_id_animal_id_fkey";
            columns: ["ranch_id", "animal_id"];
            isOneToOne: false;
            referencedRelation: "public_animal_cards";
            referencedColumns: ["ranch_id", "id"];
          },
          {
            foreignKeyName: "animal_facts_ranch_id_animal_id_fkey";
            columns: ["ranch_id", "animal_id"];
            isOneToOne: false;
            referencedRelation: "public_breeding_services";
            referencedColumns: ["ranch_id", "animal_id"];
          },
        ];
      };
      animal_media: {
        Row: {
          animal_id: string;
          created_at: string;
          media_id: string;
          ranch_id: string;
          sort_order: number;
        };
        Insert: {
          animal_id: string;
          created_at?: string;
          media_id: string;
          ranch_id: string;
          sort_order?: number;
        };
        Update: {
          animal_id?: string;
          created_at?: string;
          media_id?: string;
          ranch_id?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "animal_media_ranch_id_animal_id_fkey";
            columns: ["ranch_id", "animal_id"];
            isOneToOne: false;
            referencedRelation: "animals";
            referencedColumns: ["ranch_id", "id"];
          },
          {
            foreignKeyName: "animal_media_ranch_id_animal_id_fkey";
            columns: ["ranch_id", "animal_id"];
            isOneToOne: false;
            referencedRelation: "public_animal_cards";
            referencedColumns: ["ranch_id", "id"];
          },
          {
            foreignKeyName: "animal_media_ranch_id_animal_id_fkey";
            columns: ["ranch_id", "animal_id"];
            isOneToOne: false;
            referencedRelation: "public_breeding_services";
            referencedColumns: ["ranch_id", "animal_id"];
          },
          {
            foreignKeyName: "animal_media_ranch_id_media_id_fkey";
            columns: ["ranch_id", "media_id"];
            isOneToOne: false;
            referencedRelation: "media";
            referencedColumns: ["ranch_id", "id"];
          },
        ];
      };
      animal_sections: {
        Row: {
          animal_id: string;
          body: NonNullable<Json>;
          heading: string;
          id: string;
          ranch_id: string;
          sort_order: number;
        };
        Insert: {
          animal_id: string;
          body: NonNullable<Json>;
          heading: string;
          id?: string;
          ranch_id: string;
          sort_order?: number;
        };
        Update: {
          animal_id?: string;
          body?: NonNullable<Json>;
          heading?: string;
          id?: string;
          ranch_id?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "animal_sections_ranch_id_animal_id_fkey";
            columns: ["ranch_id", "animal_id"];
            isOneToOne: false;
            referencedRelation: "animals";
            referencedColumns: ["ranch_id", "id"];
          },
          {
            foreignKeyName: "animal_sections_ranch_id_animal_id_fkey";
            columns: ["ranch_id", "animal_id"];
            isOneToOne: false;
            referencedRelation: "public_animal_cards";
            referencedColumns: ["ranch_id", "id"];
          },
          {
            foreignKeyName: "animal_sections_ranch_id_animal_id_fkey";
            columns: ["ranch_id", "animal_id"];
            isOneToOne: false;
            referencedRelation: "public_breeding_services";
            referencedColumns: ["ranch_id", "animal_id"];
          },
        ];
      };
      animal_slug_history: {
        Row: {
          animal_id: string;
          created_at: string;
          old_slug: string;
          ranch_id: string;
        };
        Insert: {
          animal_id: string;
          created_at?: string;
          old_slug: string;
          ranch_id: string;
        };
        Update: {
          animal_id?: string;
          created_at?: string;
          old_slug?: string;
          ranch_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "animal_slug_history_ranch_id_animal_id_fkey";
            columns: ["ranch_id", "animal_id"];
            isOneToOne: false;
            referencedRelation: "animals";
            referencedColumns: ["ranch_id", "id"];
          },
          {
            foreignKeyName: "animal_slug_history_ranch_id_animal_id_fkey";
            columns: ["ranch_id", "animal_id"];
            isOneToOne: false;
            referencedRelation: "public_animal_cards";
            referencedColumns: ["ranch_id", "id"];
          },
          {
            foreignKeyName: "animal_slug_history_ranch_id_animal_id_fkey";
            columns: ["ranch_id", "animal_id"];
            isOneToOne: false;
            referencedRelation: "public_breeding_services";
            referencedColumns: ["ranch_id", "animal_id"];
          },
        ];
      };
      animal_videos: {
        Row: {
          animal_id: string;
          id: string;
          ranch_id: string;
          sort_order: number;
          title: string | null;
          url: string;
        };
        Insert: {
          animal_id: string;
          id?: string;
          ranch_id: string;
          sort_order?: number;
          title?: string | null;
          url: string;
        };
        Update: {
          animal_id?: string;
          id?: string;
          ranch_id?: string;
          sort_order?: number;
          title?: string | null;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "animal_videos_ranch_id_animal_id_fkey";
            columns: ["ranch_id", "animal_id"];
            isOneToOne: false;
            referencedRelation: "animals";
            referencedColumns: ["ranch_id", "id"];
          },
          {
            foreignKeyName: "animal_videos_ranch_id_animal_id_fkey";
            columns: ["ranch_id", "animal_id"];
            isOneToOne: false;
            referencedRelation: "public_animal_cards";
            referencedColumns: ["ranch_id", "id"];
          },
          {
            foreignKeyName: "animal_videos_ranch_id_animal_id_fkey";
            columns: ["ranch_id", "animal_id"];
            isOneToOne: false;
            referencedRelation: "public_breeding_services";
            referencedColumns: ["ranch_id", "animal_id"];
          },
        ];
      };
      animals: {
        Row: {
          archived_at: string | null;
          birth_date: string | null;
          birth_precision: Database["public"]["Enums"]["birth_precision"];
          birth_year: number | null;
          breed: string | null;
          breeding_available: boolean;
          category_confirmed_at: string | null;
          category_id: string | null;
          color: string | null;
          created_at: string;
          created_by: string | null;
          dam_id: string | null;
          deceased_on: string | null;
          deceased_precision: Database["public"]["Enums"]["birth_precision"];
          description: Json | null;
          display_order: number;
          id: string;
          is_demo: boolean;
          is_featured: boolean;
          is_published: boolean;
          name: string;
          primary_media_id: string | null;
          program_status: Database["public"]["Enums"]["program_status"];
          ranch_id: string;
          record_scope: Database["public"]["Enums"]["record_scope"];
          registered_name: string | null;
          registration_number: string | null;
          registry: string | null;
          sex: Database["public"]["Enums"]["animal_sex"];
          sire_id: string | null;
          slug: string;
          species: Database["public"]["Enums"]["species"];
          species_attrs: NonNullable<Json>;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          archived_at?: string | null;
          birth_date?: string | null;
          birth_precision?: Database["public"]["Enums"]["birth_precision"];
          birth_year?: never;
          breed?: string | null;
          breeding_available?: boolean;
          category_confirmed_at?: string | null;
          category_id?: string | null;
          color?: string | null;
          created_at?: string;
          created_by?: string | null;
          dam_id?: string | null;
          deceased_on?: string | null;
          deceased_precision?: Database["public"]["Enums"]["birth_precision"];
          description?: Json | null;
          display_order?: number;
          id?: string;
          is_demo?: boolean;
          is_featured?: boolean;
          is_published?: boolean;
          name: string;
          primary_media_id?: string | null;
          program_status?: Database["public"]["Enums"]["program_status"];
          ranch_id: string;
          record_scope?: Database["public"]["Enums"]["record_scope"];
          registered_name?: string | null;
          registration_number?: string | null;
          registry?: string | null;
          sex?: Database["public"]["Enums"]["animal_sex"];
          sire_id?: string | null;
          slug: string;
          species: Database["public"]["Enums"]["species"];
          species_attrs?: NonNullable<Json>;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          archived_at?: string | null;
          birth_date?: string | null;
          birth_precision?: Database["public"]["Enums"]["birth_precision"];
          birth_year?: never;
          breed?: string | null;
          breeding_available?: boolean;
          category_confirmed_at?: string | null;
          category_id?: string | null;
          color?: string | null;
          created_at?: string;
          created_by?: string | null;
          dam_id?: string | null;
          deceased_on?: string | null;
          deceased_precision?: Database["public"]["Enums"]["birth_precision"];
          description?: Json | null;
          display_order?: number;
          id?: string;
          is_demo?: boolean;
          is_featured?: boolean;
          is_published?: boolean;
          name?: string;
          primary_media_id?: string | null;
          program_status?: Database["public"]["Enums"]["program_status"];
          ranch_id?: string;
          record_scope?: Database["public"]["Enums"]["record_scope"];
          registered_name?: string | null;
          registration_number?: string | null;
          registry?: string | null;
          sex?: Database["public"]["Enums"]["animal_sex"];
          sire_id?: string | null;
          slug?: string;
          species?: Database["public"]["Enums"]["species"];
          species_attrs?: NonNullable<Json>;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "animals_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "animal_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "animals_ranch_id_dam_id_fkey";
            columns: ["ranch_id", "dam_id"];
            isOneToOne: false;
            referencedRelation: "animals";
            referencedColumns: ["ranch_id", "id"];
          },
          {
            foreignKeyName: "animals_ranch_id_dam_id_fkey";
            columns: ["ranch_id", "dam_id"];
            isOneToOne: false;
            referencedRelation: "public_animal_cards";
            referencedColumns: ["ranch_id", "id"];
          },
          {
            foreignKeyName: "animals_ranch_id_dam_id_fkey";
            columns: ["ranch_id", "dam_id"];
            isOneToOne: false;
            referencedRelation: "public_breeding_services";
            referencedColumns: ["ranch_id", "animal_id"];
          },
          {
            foreignKeyName: "animals_ranch_id_fkey";
            columns: ["ranch_id"];
            isOneToOne: false;
            referencedRelation: "ranches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "animals_ranch_id_primary_media_id_fkey";
            columns: ["ranch_id", "primary_media_id"];
            isOneToOne: false;
            referencedRelation: "media";
            referencedColumns: ["ranch_id", "id"];
          },
          {
            foreignKeyName: "animals_ranch_id_sire_id_fkey";
            columns: ["ranch_id", "sire_id"];
            isOneToOne: false;
            referencedRelation: "animals";
            referencedColumns: ["ranch_id", "id"];
          },
          {
            foreignKeyName: "animals_ranch_id_sire_id_fkey";
            columns: ["ranch_id", "sire_id"];
            isOneToOne: false;
            referencedRelation: "public_animal_cards";
            referencedColumns: ["ranch_id", "id"];
          },
          {
            foreignKeyName: "animals_ranch_id_sire_id_fkey";
            columns: ["ranch_id", "sire_id"];
            isOneToOne: false;
            referencedRelation: "public_breeding_services";
            referencedColumns: ["ranch_id", "animal_id"];
          },
        ];
      };
      breeding_services: {
        Row: {
          additional_terms: Json | null;
          animal_id: string;
          booking_fee_cents: number | null;
          breeding_season: string | null;
          collection_fee_cents: number | null;
          contract_document_id: string | null;
          contract_url: string | null;
          created_at: string;
          cta_label: string | null;
          cta_url: string | null;
          currency: string;
          female_requirements: Json | null;
          live_offspring_guarantee: boolean | null;
          live_offspring_guarantee_terms: string | null;
          ranch_id: string;
          service_type_other: string | null;
          service_types: string[];
          shipping_info: Json | null;
          status: Database["public"]["Enums"]["breeding_status"];
          stud_fee_cents: number | null;
          updated_at: string;
        };
        Insert: {
          additional_terms?: Json | null;
          animal_id: string;
          booking_fee_cents?: number | null;
          breeding_season?: string | null;
          collection_fee_cents?: number | null;
          contract_document_id?: string | null;
          contract_url?: string | null;
          created_at?: string;
          cta_label?: string | null;
          cta_url?: string | null;
          currency?: string;
          female_requirements?: Json | null;
          live_offspring_guarantee?: boolean | null;
          live_offspring_guarantee_terms?: string | null;
          ranch_id: string;
          service_type_other?: string | null;
          service_types?: string[];
          shipping_info?: Json | null;
          status?: Database["public"]["Enums"]["breeding_status"];
          stud_fee_cents?: number | null;
          updated_at?: string;
        };
        Update: {
          additional_terms?: Json | null;
          animal_id?: string;
          booking_fee_cents?: number | null;
          breeding_season?: string | null;
          collection_fee_cents?: number | null;
          contract_document_id?: string | null;
          contract_url?: string | null;
          created_at?: string;
          cta_label?: string | null;
          cta_url?: string | null;
          currency?: string;
          female_requirements?: Json | null;
          live_offspring_guarantee?: boolean | null;
          live_offspring_guarantee_terms?: string | null;
          ranch_id?: string;
          service_type_other?: string | null;
          service_types?: string[];
          shipping_info?: Json | null;
          status?: Database["public"]["Enums"]["breeding_status"];
          stud_fee_cents?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "breeding_services_ranch_id_animal_id_fkey";
            columns: ["ranch_id", "animal_id"];
            isOneToOne: false;
            referencedRelation: "animals";
            referencedColumns: ["ranch_id", "id"];
          },
          {
            foreignKeyName: "breeding_services_ranch_id_animal_id_fkey";
            columns: ["ranch_id", "animal_id"];
            isOneToOne: false;
            referencedRelation: "public_animal_cards";
            referencedColumns: ["ranch_id", "id"];
          },
          {
            foreignKeyName: "breeding_services_ranch_id_animal_id_fkey";
            columns: ["ranch_id", "animal_id"];
            isOneToOne: false;
            referencedRelation: "public_breeding_services";
            referencedColumns: ["ranch_id", "animal_id"];
          },
          {
            foreignKeyName: "breeding_services_ranch_id_contract_document_id_fkey";
            columns: ["ranch_id", "contract_document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["ranch_id", "id"];
          },
        ];
      };
      documents: {
        Row: {
          bytes: number | null;
          created_at: string;
          created_by: string | null;
          file_name: string;
          id: string;
          mime_type: string;
          ranch_id: string;
          storage_path: string;
          title: string | null;
        };
        Insert: {
          bytes?: number | null;
          created_at?: string;
          created_by?: string | null;
          file_name: string;
          id?: string;
          mime_type?: string;
          ranch_id: string;
          storage_path: string;
          title?: string | null;
        };
        Update: {
          bytes?: number | null;
          created_at?: string;
          created_by?: string | null;
          file_name?: string;
          id?: string;
          mime_type?: string;
          ranch_id?: string;
          storage_path?: string;
          title?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "documents_ranch_id_fkey";
            columns: ["ranch_id"];
            isOneToOne: false;
            referencedRelation: "ranches";
            referencedColumns: ["id"];
          },
        ];
      };
      faqs: {
        Row: {
          answer: NonNullable<Json>;
          created_at: string;
          group_label: string | null;
          id: string;
          is_demo: boolean;
          is_published: boolean;
          question: string;
          ranch_id: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          answer: NonNullable<Json>;
          created_at?: string;
          group_label?: string | null;
          id?: string;
          is_demo?: boolean;
          is_published?: boolean;
          question: string;
          ranch_id: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          answer?: NonNullable<Json>;
          created_at?: string;
          group_label?: string | null;
          id?: string;
          is_demo?: boolean;
          is_published?: boolean;
          question?: string;
          ranch_id?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "faqs_ranch_id_fkey";
            columns: ["ranch_id"];
            isOneToOne: false;
            referencedRelation: "ranches";
            referencedColumns: ["id"];
          },
        ];
      };
      hero_slides: {
        Row: {
          archived_at: string | null;
          created_at: string;
          cta_animal_id: string | null;
          cta_category_id: string | null;
          cta_kind: Database["public"]["Enums"]["cta_kind"];
          cta_label: string | null;
          cta_page: Database["public"]["Enums"]["site_page"] | null;
          cta_url: string | null;
          headline: string;
          id: string;
          is_active: boolean;
          is_demo: boolean;
          media_id: string | null;
          ranch_id: string;
          sort_order: number;
          subheadline: string | null;
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          cta_animal_id?: string | null;
          cta_category_id?: string | null;
          cta_kind?: Database["public"]["Enums"]["cta_kind"];
          cta_label?: string | null;
          cta_page?: Database["public"]["Enums"]["site_page"] | null;
          cta_url?: string | null;
          headline: string;
          id?: string;
          is_active?: boolean;
          is_demo?: boolean;
          media_id?: string | null;
          ranch_id: string;
          sort_order?: number;
          subheadline?: string | null;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          cta_animal_id?: string | null;
          cta_category_id?: string | null;
          cta_kind?: Database["public"]["Enums"]["cta_kind"];
          cta_label?: string | null;
          cta_page?: Database["public"]["Enums"]["site_page"] | null;
          cta_url?: string | null;
          headline?: string;
          id?: string;
          is_active?: boolean;
          is_demo?: boolean;
          media_id?: string | null;
          ranch_id?: string;
          sort_order?: number;
          subheadline?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "hero_slides_cta_category_id_fkey";
            columns: ["cta_category_id"];
            isOneToOne: false;
            referencedRelation: "animal_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hero_slides_ranch_id_cta_animal_id_fkey";
            columns: ["ranch_id", "cta_animal_id"];
            isOneToOne: false;
            referencedRelation: "animals";
            referencedColumns: ["ranch_id", "id"];
          },
          {
            foreignKeyName: "hero_slides_ranch_id_cta_animal_id_fkey";
            columns: ["ranch_id", "cta_animal_id"];
            isOneToOne: false;
            referencedRelation: "public_animal_cards";
            referencedColumns: ["ranch_id", "id"];
          },
          {
            foreignKeyName: "hero_slides_ranch_id_cta_animal_id_fkey";
            columns: ["ranch_id", "cta_animal_id"];
            isOneToOne: false;
            referencedRelation: "public_breeding_services";
            referencedColumns: ["ranch_id", "animal_id"];
          },
          {
            foreignKeyName: "hero_slides_ranch_id_fkey";
            columns: ["ranch_id"];
            isOneToOne: false;
            referencedRelation: "ranches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hero_slides_ranch_id_media_id_fkey";
            columns: ["ranch_id", "media_id"];
            isOneToOne: false;
            referencedRelation: "media";
            referencedColumns: ["ranch_id", "id"];
          },
        ];
      };
      media: {
        Row: {
          alt_text: string | null;
          blur_data_url: string | null;
          bytes: number | null;
          caption: string | null;
          created_at: string;
          created_by: string | null;
          focal_x: number;
          focal_y: number;
          gallery_sort: number;
          height: number | null;
          id: string;
          in_gallery: boolean;
          is_demo: boolean;
          mime_type: string | null;
          original_path: string | null;
          ranch_id: string;
          status: Database["public"]["Enums"]["media_status"];
          updated_at: string;
          variants: NonNullable<Json>;
          width: number | null;
        };
        Insert: {
          alt_text?: string | null;
          blur_data_url?: string | null;
          bytes?: number | null;
          caption?: string | null;
          created_at?: string;
          created_by?: string | null;
          focal_x?: number;
          focal_y?: number;
          gallery_sort?: number;
          height?: number | null;
          id?: string;
          in_gallery?: boolean;
          is_demo?: boolean;
          mime_type?: string | null;
          original_path?: string | null;
          ranch_id: string;
          status?: Database["public"]["Enums"]["media_status"];
          updated_at?: string;
          variants?: NonNullable<Json>;
          width?: number | null;
        };
        Update: {
          alt_text?: string | null;
          blur_data_url?: string | null;
          bytes?: number | null;
          caption?: string | null;
          created_at?: string;
          created_by?: string | null;
          focal_x?: number;
          focal_y?: number;
          gallery_sort?: number;
          height?: number | null;
          id?: string;
          in_gallery?: boolean;
          is_demo?: boolean;
          mime_type?: string | null;
          original_path?: string | null;
          ranch_id?: string;
          status?: Database["public"]["Enums"]["media_status"];
          updated_at?: string;
          variants?: NonNullable<Json>;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "media_ranch_id_fkey";
            columns: ["ranch_id"];
            isOneToOne: false;
            referencedRelation: "ranches";
            referencedColumns: ["id"];
          },
        ];
      };
      pages: {
        Row: {
          key: string;
          ranch_id: string;
          sections: NonNullable<Json>;
          title: string;
          updated_at: string;
        };
        Insert: {
          key: string;
          ranch_id: string;
          sections?: NonNullable<Json>;
          title: string;
          updated_at?: string;
        };
        Update: {
          key?: string;
          ranch_id?: string;
          sections?: NonNullable<Json>;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pages_ranch_id_fkey";
            columns: ["ranch_id"];
            isOneToOne: false;
            referencedRelation: "ranches";
            referencedColumns: ["id"];
          },
        ];
      };
      platform_admins: {
        Row: {
          created_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      post_animals: {
        Row: {
          animal_id: string;
          post_id: string;
          ranch_id: string;
        };
        Insert: {
          animal_id: string;
          post_id: string;
          ranch_id: string;
        };
        Update: {
          animal_id?: string;
          post_id?: string;
          ranch_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "post_animals_ranch_id_animal_id_fkey";
            columns: ["ranch_id", "animal_id"];
            isOneToOne: false;
            referencedRelation: "animals";
            referencedColumns: ["ranch_id", "id"];
          },
          {
            foreignKeyName: "post_animals_ranch_id_animal_id_fkey";
            columns: ["ranch_id", "animal_id"];
            isOneToOne: false;
            referencedRelation: "public_animal_cards";
            referencedColumns: ["ranch_id", "id"];
          },
          {
            foreignKeyName: "post_animals_ranch_id_animal_id_fkey";
            columns: ["ranch_id", "animal_id"];
            isOneToOne: false;
            referencedRelation: "public_breeding_services";
            referencedColumns: ["ranch_id", "animal_id"];
          },
          {
            foreignKeyName: "post_animals_ranch_id_post_id_fkey";
            columns: ["ranch_id", "post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["ranch_id", "id"];
          },
        ];
      };
      post_categories: {
        Row: {
          id: string;
          name: string;
          ranch_id: string;
          slug: string;
          sort_order: number;
        };
        Insert: {
          id?: string;
          name: string;
          ranch_id: string;
          slug: string;
          sort_order?: number;
        };
        Update: {
          id?: string;
          name?: string;
          ranch_id?: string;
          slug?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "post_categories_ranch_id_fkey";
            columns: ["ranch_id"];
            isOneToOne: false;
            referencedRelation: "ranches";
            referencedColumns: ["id"];
          },
        ];
      };
      post_media: {
        Row: {
          media_id: string;
          post_id: string;
          ranch_id: string;
          sort_order: number;
        };
        Insert: {
          media_id: string;
          post_id: string;
          ranch_id: string;
          sort_order?: number;
        };
        Update: {
          media_id?: string;
          post_id?: string;
          ranch_id?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "post_media_ranch_id_media_id_fkey";
            columns: ["ranch_id", "media_id"];
            isOneToOne: false;
            referencedRelation: "media";
            referencedColumns: ["ranch_id", "id"];
          },
          {
            foreignKeyName: "post_media_ranch_id_post_id_fkey";
            columns: ["ranch_id", "post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["ranch_id", "id"];
          },
        ];
      };
      posts: {
        Row: {
          archived_at: string | null;
          body: Json | null;
          category_id: string | null;
          created_at: string;
          created_by: string | null;
          excerpt: string | null;
          featured_media_id: string | null;
          id: string;
          is_demo: boolean;
          published_at: string | null;
          ranch_id: string;
          slug: string;
          status: Database["public"]["Enums"]["post_status"];
          title: string;
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          body?: Json | null;
          category_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          excerpt?: string | null;
          featured_media_id?: string | null;
          id?: string;
          is_demo?: boolean;
          published_at?: string | null;
          ranch_id: string;
          slug: string;
          status?: Database["public"]["Enums"]["post_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          body?: Json | null;
          category_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          excerpt?: string | null;
          featured_media_id?: string | null;
          id?: string;
          is_demo?: boolean;
          published_at?: string | null;
          ranch_id?: string;
          slug?: string;
          status?: Database["public"]["Enums"]["post_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "posts_ranch_id_category_id_fkey";
            columns: ["ranch_id", "category_id"];
            isOneToOne: false;
            referencedRelation: "post_categories";
            referencedColumns: ["ranch_id", "id"];
          },
          {
            foreignKeyName: "posts_ranch_id_featured_media_id_fkey";
            columns: ["ranch_id", "featured_media_id"];
            isOneToOne: false;
            referencedRelation: "media";
            referencedColumns: ["ranch_id", "id"];
          },
          {
            foreignKeyName: "posts_ranch_id_fkey";
            columns: ["ranch_id"];
            isOneToOne: false;
            referencedRelation: "ranches";
            referencedColumns: ["id"];
          },
        ];
      };
      ranch_branding: {
        Row: {
          brand_mark: string | null;
          font_preset: string;
          logo_media_id: string | null;
          palette: NonNullable<Json>;
          ranch_id: string;
          updated_at: string;
          wordmark_subtitle: string | null;
          wordmark_text: string | null;
        };
        Insert: {
          brand_mark?: string | null;
          font_preset?: string;
          logo_media_id?: string | null;
          palette?: NonNullable<Json>;
          ranch_id: string;
          updated_at?: string;
          wordmark_subtitle?: string | null;
          wordmark_text?: string | null;
        };
        Update: {
          brand_mark?: string | null;
          font_preset?: string;
          logo_media_id?: string | null;
          palette?: NonNullable<Json>;
          ranch_id?: string;
          updated_at?: string;
          wordmark_subtitle?: string | null;
          wordmark_text?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ranch_branding_ranch_id_fkey";
            columns: ["ranch_id"];
            isOneToOne: true;
            referencedRelation: "ranches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ranch_branding_ranch_id_logo_media_id_fkey";
            columns: ["ranch_id", "logo_media_id"];
            isOneToOne: false;
            referencedRelation: "media";
            referencedColumns: ["ranch_id", "id"];
          },
        ];
      };
      ranch_domains: {
        Row: {
          created_at: string;
          hostname: string;
          is_primary: boolean;
          ranch_id: string;
        };
        Insert: {
          created_at?: string;
          hostname: string;
          is_primary?: boolean;
          ranch_id: string;
        };
        Update: {
          created_at?: string;
          hostname?: string;
          is_primary?: boolean;
          ranch_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ranch_domains_ranch_id_fkey";
            columns: ["ranch_id"];
            isOneToOne: false;
            referencedRelation: "ranches";
            referencedColumns: ["id"];
          },
        ];
      };
      ranch_memberships: {
        Row: {
          created_at: string;
          ranch_id: string;
          role: Database["public"]["Enums"]["member_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          ranch_id: string;
          role?: Database["public"]["Enums"]["member_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          ranch_id?: string;
          role?: Database["public"]["Enums"]["member_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ranch_memberships_ranch_id_fkey";
            columns: ["ranch_id"];
            isOneToOne: false;
            referencedRelation: "ranches";
            referencedColumns: ["id"];
          },
        ];
      };
      ranch_private: {
        Row: {
          inquiry_cc: string[];
          inquiry_email: string | null;
          ranch_id: string;
          updated_at: string;
        };
        Insert: {
          inquiry_cc?: string[];
          inquiry_email?: string | null;
          ranch_id: string;
          updated_at?: string;
        };
        Update: {
          inquiry_cc?: string[];
          inquiry_email?: string | null;
          ranch_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ranch_private_ranch_id_fkey";
            columns: ["ranch_id"];
            isOneToOne: true;
            referencedRelation: "ranches";
            referencedColumns: ["id"];
          },
        ];
      };
      ranch_profile: {
        Row: {
          address_display: string | null;
          city: string | null;
          hours_text: string | null;
          intro: Json | null;
          public_phone: string | null;
          ranch_id: string;
          region: string | null;
          tagline: string | null;
          updated_at: string;
        };
        Insert: {
          address_display?: string | null;
          city?: string | null;
          hours_text?: string | null;
          intro?: Json | null;
          public_phone?: string | null;
          ranch_id: string;
          region?: string | null;
          tagline?: string | null;
          updated_at?: string;
        };
        Update: {
          address_display?: string | null;
          city?: string | null;
          hours_text?: string | null;
          intro?: Json | null;
          public_phone?: string | null;
          ranch_id?: string;
          region?: string | null;
          tagline?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ranch_profile_ranch_id_fkey";
            columns: ["ranch_id"];
            isOneToOne: true;
            referencedRelation: "ranches";
            referencedColumns: ["id"];
          },
        ];
      };
      ranch_seo: {
        Row: {
          default_description: string | null;
          ga4_id: string | null;
          gsc_verification: string | null;
          noindex: boolean;
          og_media_id: string | null;
          ranch_id: string;
          title_template: string;
          updated_at: string;
        };
        Insert: {
          default_description?: string | null;
          ga4_id?: string | null;
          gsc_verification?: string | null;
          noindex?: boolean;
          og_media_id?: string | null;
          ranch_id: string;
          title_template?: string;
          updated_at?: string;
        };
        Update: {
          default_description?: string | null;
          ga4_id?: string | null;
          gsc_verification?: string | null;
          noindex?: boolean;
          og_media_id?: string | null;
          ranch_id?: string;
          title_template?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ranch_seo_ranch_id_fkey";
            columns: ["ranch_id"];
            isOneToOne: true;
            referencedRelation: "ranches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ranch_seo_ranch_id_og_media_id_fkey";
            columns: ["ranch_id", "og_media_id"];
            isOneToOne: false;
            referencedRelation: "media";
            referencedColumns: ["ranch_id", "id"];
          },
        ];
      };
      ranches: {
        Row: {
          created_at: string;
          enabled_species: Database["public"]["Enums"]["species"][];
          features: NonNullable<Json>;
          id: string;
          name: string;
          slug: string;
          status: Database["public"]["Enums"]["ranch_status"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          enabled_species?: Database["public"]["Enums"]["species"][];
          features?: NonNullable<Json>;
          id?: string;
          name: string;
          slug: string;
          status?: Database["public"]["Enums"]["ranch_status"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          enabled_species?: Database["public"]["Enums"]["species"][];
          features?: NonNullable<Json>;
          id?: string;
          name?: string;
          slug?: string;
          status?: Database["public"]["Enums"]["ranch_status"];
          updated_at?: string;
        };
        Relationships: [];
      };
      sale_listings: {
        Row: {
          animal_id: string;
          available_on: string | null;
          created_at: string;
          currency: string;
          location_text: string | null;
          price_cents: number | null;
          price_mode: Database["public"]["Enums"]["price_mode"];
          ranch_id: string;
          sales_description: Json | null;
          show_on_sold_page: boolean;
          sold_on: string | null;
          status: Database["public"]["Enums"]["sale_status"];
          updated_at: string;
        };
        Insert: {
          animal_id: string;
          available_on?: string | null;
          created_at?: string;
          currency?: string;
          location_text?: string | null;
          price_cents?: number | null;
          price_mode?: Database["public"]["Enums"]["price_mode"];
          ranch_id: string;
          sales_description?: Json | null;
          show_on_sold_page?: boolean;
          sold_on?: string | null;
          status?: Database["public"]["Enums"]["sale_status"];
          updated_at?: string;
        };
        Update: {
          animal_id?: string;
          available_on?: string | null;
          created_at?: string;
          currency?: string;
          location_text?: string | null;
          price_cents?: number | null;
          price_mode?: Database["public"]["Enums"]["price_mode"];
          ranch_id?: string;
          sales_description?: Json | null;
          show_on_sold_page?: boolean;
          sold_on?: string | null;
          status?: Database["public"]["Enums"]["sale_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sale_listings_ranch_id_animal_id_fkey";
            columns: ["ranch_id", "animal_id"];
            isOneToOne: false;
            referencedRelation: "animals";
            referencedColumns: ["ranch_id", "id"];
          },
          {
            foreignKeyName: "sale_listings_ranch_id_animal_id_fkey";
            columns: ["ranch_id", "animal_id"];
            isOneToOne: false;
            referencedRelation: "public_animal_cards";
            referencedColumns: ["ranch_id", "id"];
          },
          {
            foreignKeyName: "sale_listings_ranch_id_animal_id_fkey";
            columns: ["ranch_id", "animal_id"];
            isOneToOne: false;
            referencedRelation: "public_breeding_services";
            referencedColumns: ["ranch_id", "animal_id"];
          },
        ];
      };
      social_links: {
        Row: {
          created_at: string;
          id: string;
          label: string | null;
          platform: Database["public"]["Enums"]["social_platform"];
          ranch_id: string;
          sort_order: number;
          url: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          label?: string | null;
          platform: Database["public"]["Enums"]["social_platform"];
          ranch_id: string;
          sort_order?: number;
          url: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          label?: string | null;
          platform?: Database["public"]["Enums"]["social_platform"];
          ranch_id?: string;
          sort_order?: number;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "social_links_ranch_id_fkey";
            columns: ["ranch_id"];
            isOneToOne: false;
            referencedRelation: "ranches";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      public_animal_cards: {
        Row: {
          birth_date: string | null;
          birth_precision: Database["public"]["Enums"]["birth_precision"] | null;
          birth_year: number | null;
          breed: string | null;
          breeding_available: boolean | null;
          breeding_status: Database["public"]["Enums"]["breeding_status"] | null;
          category_id: string | null;
          category_key: string | null;
          category_label: string | null;
          category_path: string | null;
          color: string | null;
          currency: string | null;
          deceased_on: string | null;
          deceased_precision: Database["public"]["Enums"]["birth_precision"] | null;
          display_order: number | null;
          groups_by_birth_year: boolean | null;
          id: string | null;
          is_featured: boolean | null;
          name: string | null;
          on_category_page: boolean | null;
          on_for_sale_page: boolean | null;
          on_memorial_page: boolean | null;
          on_reference_page: boolean | null;
          on_retired_page: boolean | null;
          on_sold_page: boolean | null;
          photo_alt: string | null;
          photo_blur: string | null;
          photo_focal_x: number | null;
          photo_focal_y: number | null;
          photo_height: number | null;
          photo_id: string | null;
          photo_variants: Json | null;
          photo_width: number | null;
          price_cents: number | null;
          price_mode: Database["public"]["Enums"]["price_mode"] | null;
          program_status: Database["public"]["Enums"]["program_status"] | null;
          ranch_id: string | null;
          registered_name: string | null;
          sale_status: Database["public"]["Enums"]["sale_status"] | null;
          sex: Database["public"]["Enums"]["animal_sex"] | null;
          slug: string | null;
          species: Database["public"]["Enums"]["species"] | null;
          updated_at: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "animals_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "animal_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "animals_ranch_id_fkey";
            columns: ["ranch_id"];
            isOneToOne: false;
            referencedRelation: "ranches";
            referencedColumns: ["id"];
          },
        ];
      };
      public_breeding_services: {
        Row: {
          animal_id: string | null;
          birth_year: number | null;
          breed: string | null;
          breeding_season: string | null;
          currency: string | null;
          name: string | null;
          photo_alt: string | null;
          photo_focal_x: number | null;
          photo_focal_y: number | null;
          photo_variants: Json | null;
          ranch_id: string | null;
          service_types: string[] | null;
          slug: string | null;
          species: Database["public"]["Enums"]["species"] | null;
          status: Database["public"]["Enums"]["breeding_status"] | null;
          stud_fee_cents: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "animals_ranch_id_fkey";
            columns: ["ranch_id"];
            isOneToOne: false;
            referencedRelation: "ranches";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      get_offspring: {
        Args: { p_animal: string };
        Returns: {
          animal_id: string;
          birth_year: number;
          category_label: string;
          is_linkable: boolean;
          name: string;
          other_parent_id: string;
          other_parent_linkable: boolean;
          other_parent_name: string;
          other_parent_slug: string;
          parent_role: string;
          photo_alt: string;
          photo_focal_x: number;
          photo_focal_y: number;
          photo_variants: Json;
          sex: Database["public"]["Enums"]["animal_sex"];
          slug: string;
        }[];
      };
      get_pedigree: {
        Args: { p_animal: string; p_generations?: number };
        Returns: {
          animal_id: string;
          birth_year: number;
          breed: string;
          color: string;
          generation: number;
          is_linkable: boolean;
          name: string;
          notes: Json;
          path: string;
          photo_alt: string;
          photo_focal_x: number;
          photo_focal_y: number;
          photo_variants: Json;
          record_scope: Database["public"]["Enums"]["record_scope"];
          registered_name: string;
          sex: Database["public"]["Enums"]["animal_sex"];
          slug: string;
          species: Database["public"]["Enums"]["species"];
        }[];
      };
      my_mfa_requirements: {
        Args: Record<PropertyKey, never>;
        Returns: {
          ranch_id: string;
          required: boolean;
        }[];
      };
      public_nav_counts: {
        Args: { p_ranch: string };
        Returns: {
          bucket: string;
          species: Database["public"]["Enums"]["species"];
          total: number;
        }[];
      };
      resolve_animal_slug: {
        Args: { p_ranch: string; p_slug: string };
        Returns: {
          is_redirect: boolean;
          slug: string;
        }[];
      };
      resolve_host: {
        Args: { p_hostname: string };
        Returns: {
          is_primary: boolean;
          primary_hostname: string;
          ranch_id: string;
          ranch_slug: string;
          ranch_status: Database["public"]["Enums"]["ranch_status"];
        }[];
      };
      resolve_ranch_slug: {
        Args: { p_slug: string };
        Returns: {
          is_primary: boolean;
          primary_hostname: string;
          ranch_id: string;
          ranch_slug: string;
          ranch_status: Database["public"]["Enums"]["ranch_status"];
        }[];
      };
    };
    Enums: {
      animal_sex: "male" | "female" | "gelding" | "steer" | "unknown";
      birth_precision: "year" | "month" | "day";
      breeding_status: "available" | "private_treaty" | "retired";
      cta_kind: "none" | "page" | "category" | "animal" | "external";
      media_status: "processing" | "ready" | "failed";
      member_role: "owner" | "editor";
      post_status: "draft" | "published";
      price_mode: "price" | "contact" | "hidden";
      program_status: "active" | "retired" | "reference" | "deceased";
      ranch_status: "draft" | "live" | "suspended";
      record_scope: "inventory" | "pedigree_only";
      sale_status: "available" | "pending" | "sold";
      site_page:
        | "home"
        | "about"
        | "horses"
        | "cattle"
        | "for_sale"
        | "horses_for_sale"
        | "cattle_for_sale"
        | "gallery"
        | "updates"
        | "faq"
        | "contact";
      social_platform: "facebook" | "instagram" | "youtube" | "tiktok" | "x" | "linkedin" | "pinterest" | "other";
      species: "horse" | "cattle";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      animal_sex: ["male", "female", "gelding", "steer", "unknown"],
      birth_precision: ["year", "month", "day"],
      breeding_status: ["available", "private_treaty", "retired"],
      cta_kind: ["none", "page", "category", "animal", "external"],
      media_status: ["processing", "ready", "failed"],
      member_role: ["owner", "editor"],
      post_status: ["draft", "published"],
      price_mode: ["price", "contact", "hidden"],
      program_status: ["active", "retired", "reference", "deceased"],
      ranch_status: ["draft", "live", "suspended"],
      record_scope: ["inventory", "pedigree_only"],
      sale_status: ["available", "pending", "sold"],
      site_page: [
        "home",
        "about",
        "horses",
        "cattle",
        "for_sale",
        "horses_for_sale",
        "cattle_for_sale",
        "gallery",
        "updates",
        "faq",
        "contact",
      ],
      social_platform: ["facebook", "instagram", "youtube", "tiktok", "x", "linkedin", "pinterest", "other"],
      species: ["horse", "cattle"],
    },
  },
} as const;
