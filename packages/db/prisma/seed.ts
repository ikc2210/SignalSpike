import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TemplateInput {
  slug: string;
  name: string;
  templateType: string;
  entityTypes: string[];
  targetEntityIds: string[];
  objective: string;
  topics: string[];
  queryPattern: string;
  cadence: string;
  domainAllowlist: string[];
  active: boolean;
}

const templates: TemplateInput[] = [
  // -------------------------------------------------------------------------
  // DISCOVERY TEMPLATES (1-10)
  // -------------------------------------------------------------------------
  {
    slug: 'disc-national-legislature',
    name: 'Discovery: National Legislature',
    templateType: 'entity_type_discovery',
    entityTypes: ['national_legislature'],
    targetEntityIds: [],
    objective: 'activities',
    topics: [],
    queryPattern:
      'Which congressional committees or subcommittees are currently most active on AI regulation? List the committees, their chairs, and the AI-related bills they are working on.',
    cadence: 'weekly',
    domainAllowlist: ['congress.gov', 'house.gov', 'senate.gov', 'govinfo.gov'],
    active: true,
  },
  {
    slug: 'disc-executive-body',
    name: 'Discovery: Executive Body',
    templateType: 'entity_type_discovery',
    entityTypes: ['executive_body'],
    targetEntityIds: [],
    objective: 'activities',
    topics: [],
    queryPattern:
      'Which executive offices, agencies, or task forces in the US federal government are currently leading AI policy work? Include OSTP, NIST AI efforts, OMB, and any AI-focused task forces.',
    cadence: 'weekly',
    domainAllowlist: ['whitehouse.gov', 'federalregister.gov', 'omb.gov'],
    active: true,
  },
  {
    slug: 'disc-cross-cutting-regulator',
    name: 'Discovery: Cross-Cutting Regulator',
    templateType: 'entity_type_discovery',
    entityTypes: ['cross_cutting_regulator'],
    targetEntityIds: [],
    objective: 'activities',
    topics: [],
    queryPattern:
      'Which US federal regulatory agencies with cross-sector authority have the most active AI enforcement, rulemaking, or guidance programs? Include FTC, SEC, DOJ, and CFPB.',
    cadence: 'weekly',
    domainAllowlist: ['federalregister.gov', 'regulations.gov', 'ftc.gov', 'sec.gov'],
    active: true,
  },
  {
    slug: 'disc-sectoral-regulator',
    name: 'Discovery: Sectoral Regulator',
    templateType: 'entity_type_discovery',
    entityTypes: ['sectoral_regulator'],
    targetEntityIds: [],
    objective: 'activities',
    topics: [],
    queryPattern:
      'Which US sector-specific regulators have issued significant AI-related rules, guidance, or enforcement actions recently? Cover FDA, OCC, FDIC, CFTC, FCC, FAA, and DOT.',
    cadence: 'weekly',
    domainAllowlist: ['federalregister.gov', 'regulations.gov', 'fda.gov', 'occ.gov'],
    active: true,
  },
  {
    slug: 'disc-court-tribunal',
    name: 'Discovery: Court / Tribunal',
    templateType: 'entity_type_discovery',
    entityTypes: ['court_tribunal'],
    targetEntityIds: [],
    objective: 'activities',
    topics: [],
    queryPattern:
      'Which US courts have issued significant AI-related rulings or have major AI cases pending? Include copyright, liability, employment discrimination, and regulatory jurisdiction cases.',
    cadence: 'weekly',
    domainAllowlist: ['supremecourt.gov', 'uscourts.gov'],
    active: true,
  },
  {
    slug: 'disc-international-org',
    name: 'Discovery: International Organization',
    templateType: 'entity_type_discovery',
    entityTypes: ['international_organization'],
    targetEntityIds: [],
    objective: 'activities',
    topics: [],
    queryPattern:
      'Which international organizations are most actively shaping AI governance globally? Include OECD, UN agencies, Council of Europe, EU institutions, and G7 AI initiatives.',
    cadence: 'weekly',
    domainAllowlist: ['oecd.org', 'oecd.ai', 'un.org', 'coe.int', 'europa.eu'],
    active: true,
  },
  {
    slug: 'disc-frontier-developer',
    name: 'Discovery: Frontier Developer',
    templateType: 'entity_type_discovery',
    entityTypes: ['frontier_developer'],
    targetEntityIds: [],
    objective: 'activities',
    topics: [],
    queryPattern:
      'Which AI laboratories or frontier developers have the largest current footprint in AI policy debates, safety commitments, and government engagement? Name the organizations and their policy relevance.',
    cadence: 'weekly',
    domainAllowlist: [],
    active: true,
  },
  {
    slug: 'disc-compute-infra',
    name: 'Discovery: Compute Infrastructure Provider',
    templateType: 'entity_type_discovery',
    entityTypes: ['compute_infra_provider'],
    targetEntityIds: [],
    objective: 'activities',
    topics: [],
    queryPattern:
      'Which cloud providers, chip manufacturers, and data center operators are most central to AI compute policy, export control discussions, and government AI procurement?',
    cadence: 'weekly',
    domainAllowlist: ['bis.doc.gov', 'sam.gov', 'nvidia.com'],
    active: true,
  },
  {
    slug: 'disc-standards-body',
    name: 'Discovery: Standards Body',
    templateType: 'entity_type_discovery',
    entityTypes: ['standards_body'],
    targetEntityIds: [],
    objective: 'activities',
    topics: [],
    queryPattern:
      'Which standards organizations have active AI standards development programs? Include NIST, ISO/IEC JTC 1, IEEE, ETSI, and any new AI-specific standards bodies.',
    cadence: 'weekly',
    domainAllowlist: ['nist.gov', 'iso.org', 'ieee.org', 'etsi.org'],
    active: true,
  },
  {
    slug: 'disc-safety-institute',
    name: 'Discovery: Safety Institute',
    templateType: 'entity_type_discovery',
    entityTypes: ['safety_institute'],
    targetEntityIds: [],
    objective: 'activities',
    topics: [],
    queryPattern:
      'Which AI safety research institutes and evaluation organizations are currently producing policy-relevant work? Include government-backed and independent safety institutes globally.',
    cadence: 'weekly',
    domainAllowlist: ['nist.gov'],
    active: true,
  },

  // -------------------------------------------------------------------------
  // MONITORING TEMPLATES (11-30)
  // -------------------------------------------------------------------------

  // national_legislature
  {
    slug: 'mon-legislature-activities',
    name: 'Legislature: Activities',
    templateType: 'entity_monitoring',
    entityTypes: ['national_legislature'],
    targetEntityIds: [],
    objective: 'activities',
    topics: [],
    queryPattern:
      'What AI-related legislation has {entity} introduced, moved through committee, or brought to a vote in the past 30 days? Include bill numbers, status, and sponsors.',
    cadence: 'weekly',
    domainAllowlist: ['congress.gov', 'house.gov', 'senate.gov', 'govinfo.gov'],
    active: true,
  },
  {
    slug: 'mon-legislature-positions',
    name: 'Legislature: Positions',
    templateType: 'entity_monitoring',
    entityTypes: ['national_legislature'],
    targetEntityIds: [],
    objective: 'positions',
    topics: [],
    queryPattern:
      'What are the publicly stated positions of members of {entity} on AI regulation, mandatory safety testing, liability for AI harms, and federal preemption of state AI laws?',
    cadence: 'monthly',
    domainAllowlist: [],
    active: true,
  },

  // executive_body
  {
    slug: 'mon-executive-activities',
    name: 'Executive Body: Activities',
    templateType: 'entity_monitoring',
    entityTypes: ['executive_body'],
    targetEntityIds: [],
    objective: 'activities',
    topics: [],
    queryPattern:
      'What executive orders, policy memoranda, agency rules, or interagency directives related to AI has {entity} issued or proposed in the past 30 days?',
    cadence: 'weekly',
    domainAllowlist: ['whitehouse.gov', 'federalregister.gov', 'omb.gov'],
    active: true,
  },
  {
    slug: 'mon-executive-positions',
    name: 'Executive Body: Positions',
    templateType: 'entity_monitoring',
    entityTypes: ['executive_body'],
    targetEntityIds: [],
    objective: 'positions',
    topics: [],
    queryPattern:
      "What are {entity}'s current stated priorities on AI governance, including safety standards, federal procurement rules, and international AI cooperation frameworks?",
    cadence: 'monthly',
    domainAllowlist: [],
    active: true,
  },

  // cross_cutting_regulator
  {
    slug: 'mon-xreg-activities',
    name: 'Cross-Cutting Regulator: Activities',
    templateType: 'entity_monitoring',
    entityTypes: ['cross_cutting_regulator'],
    targetEntityIds: [],
    objective: 'activities',
    topics: [],
    queryPattern:
      'What AI-related rules, guidance documents, consent orders, civil investigative demands, or enforcement actions has {entity} issued or announced in the past 30 days?',
    cadence: 'weekly',
    domainAllowlist: [
      'federalregister.gov',
      'regulations.gov',
      'ftc.gov',
      'sec.gov',
      'bis.doc.gov',
    ],
    active: true,
  },
  {
    slug: 'mon-xreg-positions',
    name: 'Cross-Cutting Regulator: Positions',
    templateType: 'entity_monitoring',
    entityTypes: ['cross_cutting_regulator'],
    targetEntityIds: [],
    objective: 'positions',
    topics: [],
    queryPattern:
      "What is {entity}'s stated position on its jurisdiction over AI systems, its AI enforcement priorities, and its planned rulemaking agenda for AI?",
    cadence: 'monthly',
    domainAllowlist: [],
    active: true,
  },

  // sectoral_regulator
  {
    slug: 'mon-sreg-activities',
    name: 'Sectoral Regulator: Activities',
    templateType: 'entity_monitoring',
    entityTypes: ['sectoral_regulator'],
    targetEntityIds: [],
    objective: 'activities',
    topics: [],
    queryPattern:
      'What sector-specific AI guidance, no-action letters, proposed rules, or enforcement actions has {entity} issued in the past 30 days?',
    cadence: 'weekly',
    domainAllowlist: [
      'federalregister.gov',
      'regulations.gov',
      'fda.gov',
      'occ.gov',
      'fdic.gov',
      'dot.gov',
    ],
    active: true,
  },
  {
    slug: 'mon-sreg-positions',
    name: 'Sectoral Regulator: Positions',
    templateType: 'entity_monitoring',
    entityTypes: ['sectoral_regulator'],
    targetEntityIds: [],
    objective: 'positions',
    topics: [],
    queryPattern:
      "What is {entity}'s stated position on AI use in its regulated sector, including required disclosures, safety standards, and liability for AI-assisted decisions?",
    cadence: 'monthly',
    domainAllowlist: [],
    active: true,
  },

  // court_tribunal
  {
    slug: 'mon-court-activities',
    name: 'Court / Tribunal: Activities',
    templateType: 'entity_monitoring',
    entityTypes: ['court_tribunal'],
    targetEntityIds: [],
    objective: 'activities',
    topics: [],
    queryPattern:
      'What significant AI-related rulings, opinions, orders, or decisions has {entity} issued in the past 30 days? Include copyright, liability, discrimination, and evidence cases.',
    cadence: 'weekly',
    domainAllowlist: ['supremecourt.gov', 'uscourts.gov'],
    active: true,
  },
  {
    slug: 'mon-court-positions',
    name: 'Court / Tribunal: Positions',
    templateType: 'entity_monitoring',
    entityTypes: ['court_tribunal'],
    targetEntityIds: [],
    objective: 'positions',
    topics: [],
    queryPattern:
      'What legal standards or principles has {entity} articulated in recent AI-related cases, including on authorship, negligence, discrimination, and regulatory deference?',
    cadence: 'monthly',
    domainAllowlist: [],
    active: true,
  },

  // international_organization
  {
    slug: 'mon-intl-activities',
    name: 'International Organization: Activities',
    templateType: 'entity_monitoring',
    entityTypes: ['international_organization'],
    targetEntityIds: [],
    objective: 'activities',
    topics: [],
    queryPattern:
      'What AI governance frameworks, recommendations, treaties, working group outputs, or policy positions has {entity} published or advanced in the past 30 days?',
    cadence: 'weekly',
    domainAllowlist: ['oecd.org', 'oecd.ai', 'un.org', 'coe.int', 'europa.eu'],
    active: true,
  },
  {
    slug: 'mon-intl-positions',
    name: 'International Organization: Positions',
    templateType: 'entity_monitoring',
    entityTypes: ['international_organization'],
    targetEntityIds: [],
    objective: 'positions',
    topics: [],
    queryPattern:
      "What is {entity}'s official position on international AI governance, including binding vs voluntary frameworks, cross-border enforcement, and liability regimes?",
    cadence: 'monthly',
    domainAllowlist: [],
    active: true,
  },

  // frontier_developer
  {
    slug: 'mon-frontier-activities',
    name: 'Frontier Developer: Activities',
    templateType: 'entity_monitoring',
    entityTypes: ['frontier_developer'],
    targetEntityIds: [],
    objective: 'activities',
    topics: [],
    queryPattern:
      'What model releases, capability announcements, safety commitments, policy filings, government contracts, or significant public statements has {entity} made in the past 14 days?',
    cadence: 'daily',
    domainAllowlist: [],
    active: true,
  },
  {
    slug: 'mon-frontier-positions',
    name: 'Frontier Developer: Positions',
    templateType: 'entity_monitoring',
    entityTypes: ['frontier_developer'],
    targetEntityIds: [],
    objective: 'positions',
    topics: [],
    queryPattern:
      "What are {entity}'s publicly stated positions on mandatory AI safety evaluations, government oversight of frontier model development, and liability for AI harms?",
    cadence: 'weekly',
    domainAllowlist: [],
    active: true,
  },

  // compute_infra_provider
  {
    slug: 'mon-compute-activities',
    name: 'Compute Infrastructure Provider: Activities',
    templateType: 'entity_monitoring',
    entityTypes: ['compute_infra_provider'],
    targetEntityIds: [],
    objective: 'activities',
    topics: [],
    queryPattern:
      'What government contracts, export control compliance decisions, AI infrastructure investments, or policy announcements has {entity} made in the past 30 days?',
    cadence: 'weekly',
    domainAllowlist: ['bis.doc.gov', 'sam.gov'],
    active: true,
  },
  {
    slug: 'mon-compute-positions',
    name: 'Compute Infrastructure Provider: Positions',
    templateType: 'entity_monitoring',
    entityTypes: ['compute_infra_provider'],
    targetEntityIds: [],
    objective: 'positions',
    topics: [],
    queryPattern:
      "What is {entity}'s stated position on export controls on AI chips and cloud services, compute governance frameworks, and government AI procurement policies?",
    cadence: 'monthly',
    domainAllowlist: [],
    active: true,
  },

  // standards_body
  {
    slug: 'mon-standards-activities',
    name: 'Standards Body: Activities',
    templateType: 'entity_monitoring',
    entityTypes: ['standards_body'],
    targetEntityIds: [],
    objective: 'activities',
    topics: [],
    queryPattern:
      'What AI-related standards, technical reports, working group outputs, or public consultations has {entity} published or launched in the past 60 days?',
    cadence: 'monthly',
    domainAllowlist: ['nist.gov', 'iso.org', 'ieee.org', 'etsi.org', 'iec.ch'],
    active: true,
  },
  {
    slug: 'mon-standards-positions',
    name: 'Standards Body: Positions',
    templateType: 'entity_monitoring',
    entityTypes: ['standards_body'],
    targetEntityIds: [],
    objective: 'positions',
    topics: [],
    queryPattern:
      'What principles and priorities is {entity} applying to AI standards development, including risk classification approaches, transparency requirements, and interoperability standards?',
    cadence: 'monthly',
    domainAllowlist: [],
    active: true,
  },

  // safety_institute
  {
    slug: 'mon-safety-activities',
    name: 'Safety Institute: Activities',
    templateType: 'entity_monitoring',
    entityTypes: ['safety_institute'],
    targetEntityIds: [],
    objective: 'activities',
    topics: [],
    queryPattern:
      'What AI safety evaluations, red-teaming results, capability assessments, incident analyses, or policy recommendations has {entity} published in the past 30 days?',
    cadence: 'weekly',
    domainAllowlist: ['nist.gov'],
    active: true,
  },
  {
    slug: 'mon-safety-positions',
    name: 'Safety Institute: Positions',
    templateType: 'entity_monitoring',
    entityTypes: ['safety_institute'],
    targetEntityIds: [],
    objective: 'positions',
    topics: [],
    queryPattern:
      "What is {entity}'s current position on mandatory AI safety evaluations before deployment, minimum safety thresholds, and the appropriate role of government in AI safety oversight?",
    cadence: 'monthly',
    domainAllowlist: [],
    active: true,
  },
];

async function main() {
  console.log('Seeding database...');

  for (const template of templates) {
    await prisma.queryTemplate.upsert({
      where: { slug: template.slug },
      update: {
        name: template.name,
        templateType: template.templateType,
        entityTypes: template.entityTypes,
        targetEntityIds: template.targetEntityIds,
        objective: template.objective,
        topics: template.topics,
        queryPattern: template.queryPattern,
        cadence: template.cadence,
        domainAllowlist: template.domainAllowlist,
        active: template.active,
      },
      create: {
        slug: template.slug,
        name: template.name,
        templateType: template.templateType,
        entityTypes: template.entityTypes,
        targetEntityIds: template.targetEntityIds,
        objective: template.objective,
        topics: template.topics,
        queryPattern: template.queryPattern,
        cadence: template.cadence,
        domainAllowlist: template.domainAllowlist,
        active: template.active,
      },
    });
    console.log(`  Upserted: ${template.slug}`);
  }

  console.log(`Done — ${templates.length} templates seeded.`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
