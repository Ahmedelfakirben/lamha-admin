export type ShootingType = 'shooting' | 'party';

export const SHOOTING_TYPE_I18N = {
  fr: {
    label: "Cadre & Environnement *",
    sublabel: "Précisez si la séance a lieu au studio ou en extérieur / événement",
    shooting: "Shooting",
    shootingBadge: "Studio",
    shootingDesc: "En Studio / Intérieur",
    party: "Party",
    partyBadge: "Extérieur",
    partyDesc: "En Extérieur / Événement",
    filterAll: "Tous les cadres (Studio / Ext.)",
    filterShooting: "Shooting (Studio)",
    filterParty: "Party (Extérieur)",
  },
  es: {
    label: "Entorno & Localización *",
    sublabel: "Indica si la sesión es en el estudio o en exteriores / evento",
    shooting: "Shooting",
    shootingBadge: "Estudio",
    shootingDesc: "En Estudio / Interior",
    party: "Party",
    partyBadge: "Exterior",
    partyDesc: "En Exterior / Evento",
    filterAll: "Todos los entornos (Estudio / Ext.)",
    filterShooting: "Shooting (Estudio)",
    filterParty: "Party (Exterior)",
  },
  en: {
    label: "Setting & Environment *",
    sublabel: "Specify whether the session is held in-studio or outdoors / event",
    shooting: "Shooting",
    shootingBadge: "Studio",
    shootingDesc: "In Studio / Indoor",
    party: "Party",
    partyBadge: "Outdoor",
    partyDesc: "Outdoors / Event",
    filterAll: "All settings (Studio / Outdoor)",
    filterShooting: "Shooting (Studio)",
    filterParty: "Party (Outdoor)",
  },
  ar: {
    label: "مكان وتجهيز الجلسة *",
    sublabel: "حدد ما إذا كانت الجلسة داخل الاستوديو أو في موقع خارجي / مناسبة",
    shooting: "Shooting (شوتينغ)",
    shootingBadge: "استوديو",
    shootingDesc: "داخل الاستوديو / داخلي",
    party: "Party (حفلة / خارجي)",
    partyBadge: "خارجي",
    partyDesc: "خارج الاستوديو / في الهواء الطلق",
    filterAll: "جميع الأماكن (استوديو / خارجي)",
    filterShooting: "Shooting (الاستوديو)",
    filterParty: "Party (خارجي)",
  },
};

/**
 * Extracts and normalizes the shooting type of a session.
 * Checks shooting_type field first, then fallback tags, defaulting to 'shooting'.
 */
export function getSessionShootingType(session?: {
  shooting_type?: string | null;
  tags?: string[] | string | null;
}): ShootingType {
  if (!session) return 'shooting';

  const rawType = session.shooting_type?.toLowerCase().trim();
  if (rawType === 'party') return 'party';
  if (rawType === 'shooting') return 'shooting';

  // Fallback inspect tags
  if (session.tags) {
    const tagsArr = Array.isArray(session.tags)
      ? session.tags
      : typeof session.tags === 'string'
      ? session.tags.split(',')
      : [];

    const hasParty = tagsArr.some((t: string) => {
      const lower = t.toLowerCase().trim();
      return (
        lower === 'place:party' ||
        lower === 'party' ||
        lower === 'exterieur' ||
        lower === 'extérieur' ||
        lower === 'outdoor'
      );
    });

    if (hasParty) return 'party';
  }

  return 'shooting';
}
