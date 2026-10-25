const { fields } = foundry.data;


export class CrewData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      
      
      name: new fields.StringField({ required: true, initial: "", blank: true }),

      
      description: new fields.StringField({ required: true, initial: "", blank: true }),

      reputation: new fields.NumberField({ required: true, initial: 0, min: 0, integer: true }),
      lair: new fields.StringField({ required: true, initial: "", blank: true }),
      tier: new fields.NumberField({ required: true, initial: 0, min: 0, integer: true }),

      
      deity: new fields.StringField({ required: true, initial: "", blank: true }),

      rep2: new fields.SchemaField({
        value: new fields.StringField({ required: true, initial: "", blank: true }),
        visible: new fields.BooleanField({ required: true, initial: false }),
        label: new fields.StringField({ required: true, initial: "BITD.Description", blank: true })
      }),

      hold: new fields.StringField({
        required: true,
        initial: "strong",
        blank: false,
        choices: ["weak", "strong"]
      }),

      experience: new fields.NumberField({ required: true, initial: 0, min: 0, integer: true }),

      exp_clock: new fields.SchemaField({
        value: new fields.NumberField({ required: true, initial: 0, min: 0, integer: true }),
        number: new fields.NumberField({ required: true, initial: 0, min: 0, integer: true }),
        size: new fields.NumberField({ required: true, initial: 6, min: 1, integer: true }),
        color: new fields.StringField({ required: true, initial: "black", blank: false })
      }),

      
      hold_types: new fields.ArrayField(
        new fields.StringField({ required: true, blank: false }),
        { required: true, initial: ["weak", "strong"] }
      ),

      coins: new fields.SchemaField({
        max: new fields.NumberField({ required: true, initial: 4, min: 0, integer: true }),
        value: new fields.NumberField({ required: true, initial: 0, min: 0, integer: true })
      }),

      vault: new fields.SchemaField({
        value: new fields.NumberField({ required: true, initial: 0, min: 0, integer: true }),
        max: new fields.NumberField({ required: true, initial: 0, min: 0, integer: true })
      }),

      
      gambits: new fields.SchemaField({
        value: new fields.NumberField({ required: true, initial: 0, min: 0, integer: true })
      }),

      turf: new fields.SchemaField({
        
        
        descriptions: new fields.ArrayField(new fields.StringField({ blank: true }), { required: true, initial: [] }),
        max: new fields.NumberField({ required: true, initial: 6, min: 0, integer: true }),
        
        
        bonus: new fields.NumberField({ required: true, initial: 0, integer: true }),
        
        
        claimed: new fields.NumberField({ required: true, initial: 0, min: 0, integer: true })
      }),

      
      features: new fields.ArrayField(new fields.ObjectField(), { required: true, initial: [] }),

      heat: new fields.NumberField({ required: true, initial: 0, min: 0, integer: true }),
      wanted: new fields.NumberField({ required: true, initial: 0, min: 0, integer: true }),

      
      acquaintances: new fields.ArrayField(
        new fields.SchemaField({
          id: new fields.StringField({ required: true, initial: "", blank: true }),
          name: new fields.StringField({ required: true, initial: "", blank: true }),
          standing: new fields.StringField({
            required: true,
            initial: "neutral",
            blank: false,
            choices: ["friend", "rival", "neutral"]
          }),
          description_short: new fields.StringField({ required: true, initial: "", blank: true }),
          
          
          type: new fields.StringField({ required: true, initial: "", blank: true })
        }),
        { required: true, initial: [] }
      ),

      
      acquaintances_label: new fields.StringField({ required: true, initial: "BITD.Contacts", blank: true }),

      
      hunting_grounds: new fields.ArrayField(new fields.ObjectField(), { required: true, initial: [] }),

      
      hunting_grounds_label: new fields.StringField({ required: true, initial: "BITD.HuntingGrounds", blank: true }),

      
      scoundrel: new fields.SchemaField({
        add_trauma: new fields.NumberField({ required: true, initial: 0, integer: true }),
        add_stress: new fields.NumberField({ required: true, initial: 0, integer: true }),
        mastery: new fields.BooleanField({ required: true, initial: false }),
        bonus_keys: new fields.NumberField({ required: true, initial: 0, integer: true }),
        add_load: new fields.NumberField({ required: true, initial: 0, integer: true })
      }),

      max: new fields.SchemaField({
        heat: new fields.NumberField({ required: true, initial: 9, min: 0, integer: true }),
        tier: new fields.NumberField({ required: true, initial: 4, min: 0, integer: true }),
        wanted: new fields.NumberField({ required: true, initial: 4, min: 0, integer: true }),
        rep: new fields.NumberField({ required: true, initial: 12, min: 0, integer: true }),
        exp: new fields.NumberField({ required: true, initial: 10, min: 0, integer: true })
      })
    };
  }

  
  prepareDerivedData() {
    const claimed = Number(this.turf?.claimed) || 0;
    const max = Number(this.turf?.max) || 0;
    this.turfs_amount = Math.min(Math.max(claimed, 0), max);
  }
}
