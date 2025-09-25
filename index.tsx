/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';

// --- DATA STRUCTURES --- //
// This is the complete list of all items from the guide with educational content.
const DEFECT_DATA = {
    outside: [
        {
            category: 'Site / Appeal',
            items: [
                {
                    name: 'Litter',
                    requirement: 'The property must be free of litter and debris to ensure a clean and safe environment.',
                    education: 'Litter can attract pests, pose health risks, and negatively impact the community\'s perception of the property. Regular groundskeeping and providing adequate trash receptacles are key. For large discarded items, arrange for bulk pickup immediately.',
                    defects: {
                        low: [{ description: '10 small items (food wrapper, paper, etc.) noted within 100sf area', weight: 0.1 }, { description: 'Any large item discarded incorrectly (furniture, etc.)', weight: 0.1 }],
                    }
                },
                {
                    name: 'Site Drainage',
                    requirement: 'Drainage systems must be clear and functional to prevent water accumulation and potential damage.',
                    education: 'Clogged drains can lead to soil erosion, foundation damage, pest infestations, and hazardous icy patches in winter. Ensure grates, culverts, and swales are regularly cleared of leaves, sediment, and debris. Missing or insecure covers must be replaced to prevent serious trip hazards.',
                    defects: {
                        low: [{ description: 'Evidence of clogged drains (culvert, swale, ditch, etc.)', weight: 0.1 }],
                        moderate: [{ description: 'Provided grate/cover no longer secure or missing', weight: 0.2 }]
                    }
                },
            ]
        },
        {
            category: 'Walks and Parking',
            items: [
                {
                    name: 'Handrails',
                    requirement: 'Handrails must be present where required, securely installed, and constructed to be graspable and safe.',
                    education: 'Handrails are critical for preventing falls, especially on stairs and ramps. They must be continuous, at a proper height, and able to withstand significant force. A loose or improperly installed handrail can fail under pressure, leading to serious injury. Ensure they are anchored securely and all components are intact.',
                    defects: {
                        low: [{ description: 'Handrail is missing where needed without evidence of previous installation', weight: 0.0 }],
                        moderate: [{ description: 'Handrail loose', weight: 0.2 }, { description: 'Missing with evidence of previous install', weight: 0.0 }, { description: 'Incorrect installation', weight: 0.2 }]
                    }
                },
                {
                    name: 'Parking Lot',
                    requirement: 'Parking lots must be free from significant ponding water and large, deep potholes that pose a hazard.',
                    education: 'Potholes can cause damage to vehicles and create trip-and-fall hazards for pedestrians. Significant ponding water can indicate underlying drainage issues and can lead to asphalt degradation or icy conditions. Potholes should be filled, and drainage problems addressed to maintain a safe surface.',
                    defects: {
                        moderate: [{ description: 'At least 1 pothole 4" deep and 1sf diameter', weight: 0.2 }, { description: '>3" of ponding covering >=5% of parking', weight: 0.2 }]
                    }
                },
                {
                    name: 'Roads/Drives',
                    requirement: 'Access roads must be passable and free from severe potholes or obstructions.',
                    education: 'Impassable roads are a critical life-safety issue, as they can prevent emergency vehicle access. Large potholes can damage vehicles and create hazards. Roads must be maintained to ensure they are safe and accessible at all times for residents and emergency services.',
                    defects: {
                        moderate: [{ description: 'At least 1 pothole 4" deep and 1sf diameter', weight: 0.2 }],
                        severe: [{ description: 'Access to property is blocked/impassable', weight: 0.55 }]
                    }
                },
                {
                    name: 'Walks & Ramps',
                    requirement: 'Walkways and ramps must provide a clear, functional, and unobstructed path of travel.',
                    education: 'These paths are essential for accessibility and safe pedestrian movement. Blockages can impede travel for everyone, especially those with mobility aids. Damaged sections can create trip hazards. Ensure walkways are clear of debris, equipment, and overgrowth, and that the surface is stable and intact.',
                    defects: {
                        moderate: [{ description: 'Blockage creating a lack of clear travel', weight: 0.2 }, { description: 'Not functional (severely damaged)', weight: 0.2 }]
                    }
                },
                {
                    name: 'Stairs and Steps',
                    requirement: 'Stairs must have all treads present, level, and structurally sound.',
                    education: 'Damaged or missing components on a staircase can lead directly to severe falls and injuries. Loose treads can shift unexpectedly, damaged nosing can catch a foot, and a compromised stringer indicates a potential structural failure of the entire staircase. Repairs must be made immediately to ensure user safety.',
                    defects: {
                        moderate: [{ description: 'Missing tread', weight: 0.2 }, { description: 'Loose/unlevel tread', weight: 0.2 }, { description: 'Nosing damage >1" deep or 4" wide', weight: 0.2 }, { description: 'Stringer damaged (rot, severe rust, cracks, etc.)', weight: 0.2 }]
                    }
                },
                {
                    name: 'Trip Hazard',
                    requirement: 'Walking surfaces must be even and free of significant vertical or horizontal gaps.',
                    education: 'Even small changes in elevation or gaps in a walking path can catch a person\'s foot and cause a serious fall. These are among the most common causes of injury on a property. All walkways, sidewalks, and common areas should be inspected for and repaired to eliminate these hazards.',
                    defects: {
                        moderate: [{ description: '¾ inch vertical deviation', weight: 0.2 }, { description: '2-inch horizontal separation', weight: 0.2 }],
                    }
                }
            ]
        },
        {
            category: 'Doors',
            items: [
                {
                    name: 'Garage Door',
                    requirement: 'Garage doors must be structurally intact and operate correctly and safely.',
                    education: 'A malfunctioning garage door can be a security risk and a safety hazard due to its weight and moving parts. Holes compromise security and can allow pest entry. Inoperable doors can trap vehicles or prevent access. Ensure tracks, springs, and openers are all in good working order.',
                    defects: {
                        moderate: [{ description: 'Any size penetrating hole noted', weight: 0.2 }, { description: "Door won't open, stay open or close correctly (includes auto openers)", weight: 0.2 }]
                    }
                },
                {
                    name: 'General Door (Non-Entry/Fire)',
                    requirement: 'Non-critical doors (e.g., on sheds, utility closets) must be functional.',
                    education: 'While not fire-rated or for primary entry, these doors should still operate as intended to secure areas and protect contents from the elements. Damaged hardware or surfaces that prevent the door from opening, closing, or latching should be repaired.',
                    defects: {
                        moderate: [{ description: 'Hardware or surface damage, inoperable or missing that impacts function', weight: 0.2 }]
                    }
                }
            ]
        },
        {
            category: 'Electrical',
            items: [
                {
                    name: 'Enclosures',
                    requirement: 'Electrical panels must be accessible, free from water intrusion, and all components must be intact and free from damage or foreign materials.',
                    education: 'Blocked access can delay emergency shut-offs. Water and rust inside a panel create a severe risk of short circuits, fire, and electrocution. Damaged breakers can fail to trip, and non-standard materials (like a penny in a fuse box) defeat safety mechanisms entirely. These are life-threatening conditions requiring immediate electrician attention.',
                    defects: {
                        moderate: [{ description: 'Service/breaker panel is blocked or difficult to access', weight: 0.2 }],
                        severe: [{ description: 'Water intrusion, rust or foreign substance over components', weight: 0.55 }, { description: 'Damaged breakers', weight: 2.25, lt: true }, { description: 'Foreign material (non-UL listed material) used for repair', weight: 0.55 }]
                    }
                },
                {
                    name: 'Outlets / Switches & GFCI',
                    requirement: 'Outlets must be properly wired, energized, and GFCI/AFCI protection must be installed where required and be functional.',
                    education: 'GFCI (Ground Fault Circuit Interrupter) outlets are life-saving devices that prevent electrocution in wet areas like kitchens, baths, and exteriors. AFCI (Arc Fault) protection prevents fires from damaged wiring. Incorrect wiring (like reversed polarity) or lack of grounding can damage electronics and pose a shock hazard. All outlets should be tested and repaired by a qualified electrician.',
                    defects: {
                        severe: [{ description: 'GFCI/AFCI inoperable', weight: 0.55 }, { description: 'GFCI missing where required', weight: 0.55 }, { description: 'Ungrounded or incorrect wiring noted', weight: 0.55 }, { description: 'Outlet not energized', weight: 0.55 }]
                    }
                },
                {
                    name: 'Wires or Conductors',
                    requirement: 'All electrical wiring must be fully shielded, enclosed, and protected from damage or exposure.',
                    education: 'Exposed wires or internal components of any electrical fixture present an immediate and severe risk of electrocution or fire. This is a zero-tolerance, life-threatening hazard. Covers must be intact, junction boxes must be closed, knockouts filled, and wire insulation must be undamaged. Any visible wires, wire nuts, or damaged outlets require immediate de-energizing of the circuit and repair by a licensed electrician.',
                    defects: {
                        severe: [{ description: 'Outlet/switch damaged - no longer safe', weight: 2.25, lt: true }, { description: 'Damaged or missing cover (includes wall mounted lights)', weight: 2.25 }, { description: 'Missing knockout', weight: 2.25 }, { description: 'Open breaker port', weight: 2.25 }, { description: '>1/2" gap noted', weight: 2.25 }, { description: 'Exposed wire nuts', weight: 2.25, lt: true }, { description: 'Unshielded wires noted (damaged covering)', weight: 2.25, lt: true }]
                    }
                },
                {
                    name: 'Lighting',
                    requirement: 'Exterior light fixtures must be securely attached and functional.',
                    education: 'Exterior lighting is important for safety and security, illuminating walkways and discouraging crime. A missing or damaged fixture can indicate a potential electrical hazard. Unstable fixtures or poles could fall and cause injury. Fixtures should be repaired or replaced to ensure they are secure and operational.',
                    defects: {
                        moderate: [{ description: 'Missing with evidence of previous installation', weight: 0.2 }, { description: 'Damage impacts function', weight: 0.2 }, { description: 'Not securely attached or pole is unstable', weight: 0.2 }]
                    }
                }
            ]
        },
        {
            category: 'Fire Safety',
            items: [
                {
                    name: 'Chimney',
                    requirement: 'Chimneys, flues, and fireboxes must be structurally sound and free from damage that could compromise safety.',
                    education: 'A damaged chimney or flue can allow dangerous combustion gases (like carbon monoxide) to enter the building or hot embers to escape and cause a fire. This is a life-threatening hazard that requires immediate inspection and repair by a qualified professional before the fireplace or appliance is used.',
                    defects: {
                        severe: [{ description: 'Chimney/flue or firebox damaged/unsafe', weight: 2.25, lt: true }]
                    }
                },
                {
                    name: 'Egress',
                    requirement: 'The path of egress from the property must be clear, unobstructed, and free from structural hazards.',
                    education: 'In an emergency, every second counts. A clear exit path is critical. A blocked gate, debris-filled alley, or a structurally failing fire escape can trap residents during a fire. This is a life-threatening issue. All designated exit pathways must be maintained and kept clear at all times.',
                    defects: {
                        severe: [{ description: 'Structural failure noted (leaning, etc.)', weight: 2.25, lt: true }, { description: 'Exit point is obstructed (locked gate, debris, etc.)', weight: 2.25, lt: true }]
                    }
                },
                {
                    name: 'Exit Signs',
                    requirement: 'Exit signs must be present where required, illuminated, and fully visible.',
                    education: 'During a fire, smoke can obscure vision and cause panic. Illuminated exit signs are essential beacons guiding people to safety. If a sign is missing, unlit, blocked, or damaged, it fails its life-saving purpose. The backup battery (tested with the button) must also be functional. This is a critical life-threatening deficiency.',
                    defects: {
                        severe: [{ description: 'Obscured from view (décor, plants, etc.)', weight: 2.25, lt: true }, { description: 'Not securely attached', weight: 2.25, lt: true }, { description: 'Missing where evidence of previous install', weight: 2.25, lt: true }, { description: 'No illumination (either internal or adjacent)', weight: 2.25, lt: true }, { description: 'Test button inop', weight: 2.25, lt: true }]
                    }
                },
                {
                    name: 'Fire Escapes',
                    requirement: 'Fire escapes must be structurally sound and all components must be intact.',
                    education: 'A fire escape is a path of last resort and must be able to support the weight of people evacuating. Any damage to its structural components—stairs, ladders, platforms—renders it unsafe and unreliable in an emergency. This is a life-threatening hazard requiring immediate professional repair.',
                    defects: {
                        severe: [{ description: 'Stairs, ladder, platform or handrails are damaged/missing', weight: 2.25, lt: true }]
                    }
                },
                {
                    name: 'Fire Extinguisher',
                    requirement: 'Fire extinguishers must be present, fully charged, inspected, and in good condition.',
                    education: 'A fire extinguisher can be the difference between a small, contained incident and a major disaster. It must be ready to use at a moment\'s notice. An undercharged, damaged, or expired extinguisher is unreliable. Ensure gauges are in the green, inspection tags are current (for rechargeable types), and the extinguisher is within its service life (12 years for disposable). This is a life-threatening safety failure.',
                    defects: {
                        severe: [{ description: 'Under/over charged', weight: 2.25, lt: true }, { description: 'Missing with evidence of prior installation', weight: 2.25, lt: true }, { description: 'Rechargeable: Missing or expired tag', weight: 2.25, lt: true }, { description: 'Damage (impacting function)', weight: 2.25, lt: true }, { description: 'Disposable: Extinguisher >12 years old', weight: 2.25, lt: true }]
                    }
                },
                {
                    name: 'Flammable & Combustible Items',
                    requirement: 'Flammable or combustible materials must not be stored near ignition sources.',
                    education: 'Items like gasoline, propane, paint thinners, or even piles of paper and rags can ignite easily if stored too close to a heat source like a furnace or water heater. This creates a severe and immediate fire hazard. A 3-foot clearance must be maintained at all times. This is a critical life-threatening condition.',
                    defects: {
                        severe: [{ description: 'Flammable/combustible item within 3 feet of ignition source (furnace, heater, etc.)', weight: 2.25, lt: true }]
                    }
                },
                {
                    name: 'Sprinkler Assembly',
                    requirement: 'Fire sprinkler heads must be unobstructed, undamaged, and free of foreign materials.',
                    education: 'Fire sprinklers activate automatically to control or extinguish fires. Anything blocking the spray pattern (like items stored within 18") prevents them from working effectively. Paint or corrosion on the head can delay or prevent its activation. A missing escutcheon plate can delay activation in some systems. These are serious fire safety impairments.',
                    defects: {
                        severe: [{ description: 'Obstructions placed within 18" of head', weight: 2.25, lt: true }, { description: 'Significant paint/foreign material noted on 75% of assembly', weight: 2.25 }, { description: 'Escutcheon / concealed cover plate missing', weight: 2.25 }, { description: 'Assembly damaged or corroded', weight: 2.25 }]
                    }
                }
            ]
        },
        {
            category: 'General Safety',
            items: [
                {
                    name: 'Guardrails',
                    requirement: 'Guardrails must be present at all drops of 30 inches or more, be of the correct height, and be structurally sound.',
                    education: 'Guardrails are the primary protection against falls from elevated surfaces like balconies, porches, or retaining walls. A missing, short, or damaged guardrail is a life-threatening hazard, as a fall from such a height can be fatal or cause severe injury. All components must be secure and intact.',
                    defects: {
                        severe: [{ description: 'Guardrail is missing where required', weight: 2.25, lt: true }, { description: 'Incorrect height', weight: 2.25 }, { description: 'Missing or loose components impacting function', weight: 2.25 }]
                    }
                },
                {
                    name: 'Infestation',
                    requirement: 'The property should be free from evidence of rat infestations.',
                    education: 'Rats can carry diseases, contaminate food sources, and cause significant property damage by chewing on wiring and structures. Evidence like droppings or burrows indicates an active infestation that must be addressed by professional pest control to protect resident health and safety.',
                    defects: {
                        moderate: [{ description: 'Evidence of rats (droppings, burrows, chewed holes, etc.)', weight: 0.2 }]
                    }
                },
                {
                    name: 'Sharp Edges',
                    requirement: 'The property must be free from sharp edges on building components or equipment that could cause serious injury.',
                    education: 'Exposed, sharp metal on siding, broken glass, or damaged equipment can cause deep lacerations requiring professional medical attention. These hazards must be repaired, replaced, or shielded to prevent injury.',
                    defects: {
                        severe: [{ description: 'Sharp edge noted (likely to require professional medical treatment)', weight: 0.55 }]
                    }
                }
            ]
        },
        {
            category: 'Roofing Area',
            items: [
                {
                    name: 'Lead-based Paint',
                    requirement: 'For pre-1978 properties, painted surfaces must be intact and free from deterioration.',
                    education: 'Deteriorating lead-based paint (chipping, peeling, chalking) creates toxic dust and flakes that are extremely hazardous, especially to young children, and can cause permanent neurological damage. Any deteriorating paint must be addressed using lead-safe work practices by certified professionals. This is a life-threatening health hazard.',
                    defects: {
                        moderate: [{ description: '<20 sf of deterioration (chipping, cracking, chalking, etc.)', weight: 0.2 }],
                        severe: [{ description: '>20 sf of deterioration (chipping, cracking, chalking, etc.)', weight: 2.25, lt: true }]
                    }
                },
                {
                    name: 'Guttering',
                    requirement: 'Gutters and downspouts must be securely attached and clear of debris.',
                    education: 'A properly functioning gutter system directs water away from the building\'s foundation. Clogged or damaged gutters can cause water to overflow, leading to facade damage, erosion, and water intrusion into basements or crawlspaces. Ensure they are clear and all components are secure.',
                    defects: {
                        moderate: [{ description: 'Debris limiting the drain or gutter', weight: 0.2 }, { description: 'Gutter component missing or not securely attached', weight: 0.2 }, { description: 'Gutter component damaged and impacting function', weight: 0.2 }]
                    }
                },
                {
                    name: 'Roofing Material',
                    requirement: 'The roof covering must be intact, without exposed substrate or significant ponding water.',
                    education: 'The roof is the building\'s primary defense against the elements. Damaged or missing materials expose the underlying structure (substrate) to moisture, which can lead to leaks, rot, and serious structural damage. Ponding water indicates poor drainage and can accelerate wear and lead to leaks. Roof issues should be repaired promptly.',
                    defects: {
                        moderate: [{ description: '25 sf of ponding noted', weight: 0.2 }, { description: 'Damage/missing roofing exposing substrate', weight: 0.2 }]
                    }
                },
                {
                    name: 'Soffit/Fascia',
                    requirement: 'Soffits and fascia must be intact and free from penetrating holes.',
                    education: 'These components protect the edges of the roof and attic space. Holes can allow pests like squirrels, birds, and insects to enter the attic, where they can damage wiring and insulation. They can also allow water intrusion during wind-driven rain. All holes should be sealed.',
                    defects: {
                        moderate: [{ description: 'Penetrating holes noted in soffit, fascia or roof deck', weight: 0.2 }]
                    }
                }
            ]
        },
        {
            category: 'Structures',
            items: [
                {
                    name: 'Wall Coverings',
                    requirement: 'Exterior wall coverings must be intact and provide a weather-tight barrier.',
                    education: 'The exterior wall covering (siding, brick, stucco) is the building\'s skin. Holes or missing sections compromise this barrier, allowing water and pests to enter the wall cavity, potentially leading to mold, rot, and structural damage. The covering must be maintained to be "functionally adequate."',
                    defects: {
                        moderate: [{ description: '>=1 sq ft material missing', weight: 0.2 }, { description: 'Any size hole penetrating to interior', weight: 0.2 }, { description: "Covering is not 'functionally adequate'", weight: 0.2 }, { description: 'Structural failure', weight: 0.2 }, { description: '10 sq ft of peeling paint on single wall (post-1978 building)', weight: 0.2 }]
                    }
                },
                {
                    name: 'Address & Signage',
                    requirement: 'Address and building identification must be clearly visible and legible.',
                    education: 'Clear signage is critical for emergency responders (fire, police, ambulance) to quickly locate the correct building and unit. If signs are broken, blocked, or illegible, it can cause dangerous delays in response time. All signs should be well-maintained and clearly visible from the street.',
                    defects: {
                        moderate: [{ description: 'Damage causing instability', weight: 0.2 }, { description: 'Address signage near entrance is broken, blocked or illegible', weight: 0.2 }, { description: 'Building ID signs are blocked, broken or illegible', weight: 0.2 }]
                    }
                },
                {
                    name: 'Dryer Vent',
                    requirement: 'Exterior dryer vents must have a cover and be free from blockages.',
                    education: 'A missing cover allows pests and cold air to enter the building. A vent blocked with lint is a serious fire hazard. The buildup of flammable lint combined with the heat from the dryer can easily lead to a fire. This is a life-threatening condition that requires immediate cleaning.',
                    defects: {
                        low: [{ description: 'Missing or damaged cover noted', weight: 0.1 }],
                        severe: [{ description: 'Vent is blocked/clogged (lint, nest, etc.)', weight: 2.25, lt: true }]
                    }
                },
                {
                    name: 'Erosion Under Structures',
                    requirement: 'The ground around and under structures must not show signs of significant erosion.',
                    education: 'Erosion can undermine a building\'s foundation, porch supports, or other structural elements, leading to instability and potential collapse. If a footing or support is exposed, its stability is compromised. This should be addressed by correcting the drainage issue and backfilling the eroded area.',
                    defects: {
                        low: [{ description: 'Erosion causing footer or support exposure or erosion >2 ft away and depth of erosion > than distance to structure', weight: 0.1 }]
                    }
                },
                {
                    name: 'Fences | Security',
                    requirement: 'Fences and gates must be functional and in good repair.',
                    education: 'Fences are installed for security, privacy, and safety. A leaning fence with failing posts is unstable and may collapse. A broken gate latch compromises security. Significant holes defeat the purpose of the fence. These components should be kept in good working order.',
                    defects: {
                        moderate: [{ description: 'Hole(s) effecting 20% of single section', weight: 0.2 }, { description: 'Gate latch/lock inoperable', weight: 0.2 }, { description: 'Failing post(s) allowing for lean or instability', weight: 0.2 }]
                    }
                },
                {
                    name: 'Foundation',
                    requirement: 'The foundation must be structurally sound and free from major cracks or damage.',
                    education: 'The foundation supports the entire building. While minor cracks can be normal, large cracks, exposed rebar (reinforcing steel), or crumbling (spalling) concrete can indicate more serious structural issues or water damage. Damaged posts or girders are also a significant concern. Any sign of a possible structural problem warrants evaluation by a qualified engineer.',
                    defects: {
                        moderate: [{ description: 'Damaged/missing vent', weight: 0.2 }, { description: 'Crack >=1/4" x 12"', weight: 0.2 }, { description: 'Exposed rebar noted', weight: 0.2 }, { description: 'Spalling/flaking noted - 12" x 12" x 3/4" deep', weight: 0.2 }, { description: 'Rot/damage noted to post, girder, etc.', weight: 0.2 }],
                        severe: [{ description: 'Possible structural concern noted', weight: 0.55 }]
                    }
                },
                {
                    name: 'Retaining Walls',
                    requirement: 'Retaining walls must be stable and not show signs of failure.',
                    education: 'Retaining walls hold back significant amounts of soil. A wall that is leaning or has partially collapsed is in danger of a complete failure, which could cause a landslide, property damage, and potential injury. This should be assessed and repaired by a professional.',
                    defects: {
                        moderate: [{ description: 'Leaning from fill side or portion collapsed', weight: 0.2 }]
                    }
                },
                {
                    name: 'Structural Defects',
                    requirement: 'All structural members of the building must be sound and not appear in danger of collapse.',
                    education: 'This is a catch-all for any obvious, severe structural problem not covered elsewhere, such as a failing roof truss, a collapsing porch, or a severely bowing wall. Any such observation indicates a life-threatening situation and requires immediate evacuation of the area and assessment by a structural engineer.',
                    defects: {
                        severe: [{ description: 'Any structural member appearing in danger of collapse/failure', weight: 2.25, lt: true }]
                    }
                }
            ]
        },
        {
            category: 'Utilities',
            items: [
                {
                    name: 'Leaks and Wastewater',
                    requirement: 'Utility lines must not leak, and sanitary systems must be intact.',
                    education: 'A gas or oil leak is an extreme fire and explosion hazard and is a life-threatening emergency requiring immediate evacuation and a call to the utility company. Backed-up sewage is a serious health hazard. Missing sewer cleanout covers can release sewer gas and are a trip hazard. Even minor water leaks can cause significant damage over time.',
                    defects: {
                        low: [{ description: 'Leak noted at hose bib, irrigation or fire suppression system', weight: 0.1 }],
                        moderate: [{ description: 'Sewer cleanout cover missing or damaged (includes riser)', weight: 0.2 }],
                        severe: [{ description: 'Evidence of gas, propane, oil leak', weight: 2.25, lt: true }, { description: 'Sewage backed up', weight: 0.55 }]
                    }
                }
            ]
        }
    ],
    inside: [
        {
            category: 'Restroom | Kitchen | Laundry',
            items: [
                {
                    name: 'Bath Ventilation',
                    requirement: 'Bathrooms must have a functional mechanical exhaust fan or an operable window.',
                    education: 'Proper ventilation is crucial to remove moisture from bathrooms, which prevents the growth of mold and mildew and reduces damage to walls and ceilings. If there is no window, the fan must be present, clear of obstructions, and operational.',
                    defects: {
                        moderate: [{ description: 'Inop or missing and no window present', weight: 0.23 }, { description: 'Missing or damaged vent cover', weight: 0.23 }, { description: 'Obstruction noted', weight: 0.23 }]
                    }
                },
                {
                    name: 'Cabinets',
                    requirement: 'Cabinets should be functional and in good condition.',
                    education: 'Damaged cabinets with broken doors, missing drawers, or unstable shelving can be difficult to use and may pose a hazard if they detach from the wall. Significant damage warrants repair to ensure the space is fully usable.',
                    defects: {
                        moderate: [{ description: '50% of cabinets or components missing/ damaged/inop', weight: 0.23 }]
                    }
                },
                {
                    name: 'Countertops',
                    requirement: 'There must be an adequate and sanitary food preparation area.',
                    education: 'Kitchens require a non-porous, cleanable surface for safe food preparation. A countertop with an exposed substrate (like particle board) cannot be properly sanitized and can harbor bacteria. Lack of a dedicated prep area makes sanitary cooking difficult. The surface should be repaired or replaced.',
                    defects: {
                        moderate: [{ description: 'No food prep area', weight: 0.23 }, { description: '>=10% of top has exposed substrate', weight: 0.23 }]
                    }
                },
                {
                    name: 'Grab Bars',
                    requirement: 'Grab bars, where installed, must be securely anchored.',
                    education: 'Grab bars are safety devices designed to support a person\'s full weight. A loose grab bar is a serious hazard, as it can pull out of the wall at the moment it is needed most, leading to a severe fall. They must be anchored into solid blocking, not just drywall.',
                    defects: {
                        moderate: [{ description: 'Slightly loose', weight: 0.23 }]
                    }
                },
                {
                    name: 'Refrigerator',
                    requirement: 'A refrigerator must be provided and must keep food adequately cool.',
                    education: 'A refrigerator is essential for safe food storage. If it cannot maintain a cold temperature, food will spoil, posing a health risk. Damaged seals lead to energy waste and poor cooling. Broken handles or drawers impact usability. The unit should be repaired or replaced.',
                    defects: {
                        moderate: [{ description: 'Not cooling adequately', weight: 0.23 }, { description: 'Seal sagging, torn or detached impacting function', weight: 0.23 }, { description: 'Component damaged or missing (handle, drawers, etc.) impacting function', weight: 0.23 }]
                    }
                },
                {
                    name: 'Kitchen Ventilation',
                    requirement: 'A kitchen must have a functional ventilation system (range hood or exhaust fan).',
                    education: 'Kitchen ventilation removes smoke, grease, and cooking odors. A missing filter can allow grease to build up in the ductwork, creating a fire hazard. An inoperable or blocked vent fails to perform its function. The system should be maintained and operational.',
                    defects: {
                        moderate: [{ description: 'Filter missing or damaged', weight: 0.23 }, { description: 'Vent is inoperable or part or/fully blocked', weight: 0.23 }, { description: 'Exhaust duct not securely attached or missing', weight: 0.23 }]
                    }
                },
                {
                    name: 'Range / Oven',
                    requirement: 'Cooking appliances must be functional.',
                    education: 'Residents must be able to prepare cooked food. A non-working burner or oven significantly impacts the ability to cook meals. Missing components like knobs or grates can make the appliance difficult or unsafe to use. The appliance should be repaired to full functionality.',
                    defects: {
                        low: [{ description: '1 burner or more (or oven) not producing heat', weight: 0.1 }],
                        moderate: [{ description: 'Component missing (knob, grate, oven seal, etc.)', weight: 0.23 }]
                    }
                },
                {
                    name: 'Shower/Tub & Hardware',
                    requirement: 'A tub or shower must be provided, be fully operational, and allow for privacy.',
                    education: 'A functioning bathing facility is a basic sanitation requirement. Issues like leaks, broken handles, or fully clogged drains make it unusable. Significant discoloration can indicate mold or deep staining. Lack of privacy (e.g., a missing door or curtain) is also a deficiency. The entire assembly must be in good working order.',
                    defects: {
                        low: [{ description: 'Component (stopper, curtain, etc.) damaged or missing and does NOT impact function', weight: 0.1 }, { description: '<50% discoloration', weight: 0.1 }],
                        moderate: [{ description: 'Component (diverter, head, handle, leak, door, etc.) damaged and impacts function', weight: 0.23 }, { description: '>=50% discoloration', weight: 0.23 }, { description: "Shower or tub can't be used in private", weight: 0.23 }],
                        severe: [{ description: 'Tub/shower is inoperable', weight: 0.65 }, { description: 'Drain fully clogged', weight: 0.65 }]
                    }
                },
                {
                    name: 'Sink',
                    requirement: 'Sinks must be functional, with operable handles and proper drainage.',
                    education: 'Sinks are essential for hygiene. A sink that is damaged and won\'t hold water, has missing handles, or a clogged drain is not functional. A sink pulling away from the wall can lead to a major leak and water damage. All components should be secure and in working order.',
                    defects: {
                        low: [{ description: 'Missing or inoperable stopper/strainer', weight: 0.1 }, { description: 'Leak outside of basin (around handles, etc.)', weight: 0.1 }],
                        moderate: [{ description: 'Missing or inoperable handles', weight: 0.23 }, { description: "Won't hold water (sink damaged)", weight: 0.23 }, { description: 'Drain clogged', weight: 0.23 }, { description: 'Pulled away from wall', weight: 0.23 }]
                    }
                },
                {
                    name: 'Toilet',
                    requirement: 'A toilet must be present in each unit, be securely mounted, and flush/refill correctly.',
                    education: 'A functioning toilet is a fundamental sanitation requirement. A missing toilet is a life-threatening health hazard. One that doesn\'t flush properly or is loose at its base is unusable and can cause major water damage and unsanitary conditions. It must be repaired immediately.',
                    defects: {
                        low: [{ description: "Continues to 'run' after flushing - or- tank lid or other component damaged or missing that do not impact function", weight: 0.1 }],
                        moderate: [{ description: 'Base is not secure', weight: 0.23 }, { description: 'Seat or flush handle is broken, loose or missing - impacts function', weight: 0.23 }, { description: "Toilet can't be used in private", weight: 0.23 }],
                        severe: [{ description: 'Toilet missing', weight: 2.50, lt: true }, { description: "Doesn't flush or refill correctly", weight: 0.65 }]
                    }
                }
            ]
        },
        {
            category: 'Doors',
            items: [
                {
                    name: 'Garage Door',
                    requirement: 'Garage doors must be structurally intact and operate correctly and safely.',
                    education: 'A malfunctioning garage door can be a security risk and a safety hazard. Holes compromise security. Inoperable doors can trap vehicles or prevent access. Ensure tracks, springs, and openers are all in good working order.',
                    defects: {
                        moderate: [{ description: 'Penetrating hole', weight: 0.23 }, { description: "Door won't open, stay open, close, etc.", weight: 0.23 }]
                    }
                },
                {
                    name: 'General Door (Passage)',
                    requirement: 'Interior doors must be present and operable to ensure privacy.',
                    education: 'Interior doors for bedrooms and bathrooms are essential for privacy. A missing door, or one that is damaged such that it cannot be closed, fails to provide this function. A door that is stuck shut can be a hazard, preventing egress from a room.',
                    defects: {
                        low: [{ description: 'Inoperable/missing or damage compromises privacy', weight: 0.1 }],
                        moderate: [{ description: "Passage door won't open", weight: 0.23 }]
                    }
                },
                {
                    name: 'Fire Rated Door',
                    requirement: 'Fire-rated doors (e.g., unit to garage, stairwell) must be fully functional with all fire-rated components intact.',
                    education: 'A fire door\'s job is to slow the spread of fire and smoke, giving occupants more time to escape. For it to work, it MUST latch securely and its self-closer MUST pull it fully shut. Any holes, damaged seals, or broken hardware completely defeats its purpose. A missing fire door is a life-threatening deficiency.',
                    defects: {
                        severe: [{ description: "Hardware inop/missing or door won't latch or open", weight: 0.65 }, { description: 'Self-closure inop', weight: 0.65 }, { description: 'Any size hole noted', weight: 0.65 }, { description: 'Assembly damaged (glass, frame, etc.)', weight: 0.65 }, { description: 'Door propped open', weight: 0.65 }, { description: 'Seal miss/damaged', weight: 0.65 }, { description: 'Missing fire door', weight: 2.50, lt: true }]
                    }
                },
                {
                    name: 'Entry Door',
                    requirement: 'Primary entry doors must provide security and be weather-tight.',
                    education: 'The entry door is a critical component for security. If it is missing or cannot be properly closed and locked, the unit is not secure. Damage like holes or significant gaps compromises security and weather protection, leading to energy loss and potential pest entry. The entire door assembly must function correctly.',
                    defects: {
                        low: [{ description: 'Secondary latch/lock or other non-impacting issues (deadbolt, strike plate, etc.)', weight: 0.1 }, { description: 'Door glass damaged (cracked, fogged, etc.)', weight: 0.1 }],
                        moderate: [{ description: '>=1/4" crack or hole penetrating through door or frame', weight: 0.23 }, { description: 'Self-closing hardware or lock missing/inop', weight: 0.23 }, { description: 'Delamination >2"', weight: 0.23 }, { description: 'Seal miss/damaged with >=1/4" gap or evidence of moisture penetration', weight: 0.23 }, { description: 'Frame/trim damaged impacting function', weight: 0.23 }],
                        severe: [{ description: 'Door missing', weight: 0.65 }, { description: "Door won't close (hits frame)", weight: 0.65 }]
                    }
                }
            ]
        },
        {
            category: 'Electrical',
            items: [
                {
                    name: 'Enclosures',
                    requirement: 'Electrical panels must be accessible, free from water intrusion, and all components must be intact and free from damage or foreign materials.',
                    education: 'Blocked access can delay emergency shut-offs. Water and rust inside a panel create a severe risk of short circuits, fire, and electrocution. Damaged breakers can fail to trip, and non-standard materials defeat safety mechanisms. These are life-threatening conditions requiring immediate electrician attention.',
                    defects: {
                        moderate: [{ description: 'Service/breaker panel is blocked or difficult to access', weight: 0.23 }],
                        severe: [{ description: 'Water intrusion, rust or foreign substance over breakers/fuse', weight: 0.65 }, { description: 'Damaged breakers', weight: 2.50, lt: true }, { description: 'Foreign material used in repair', weight: 0.65 }]
                    }
                },
                {
                    name: 'Outlets / Switches & GFCI/AFCI',
                    requirement: 'Outlets must be properly wired, energized, and GFCI/AFCI protection must be installed and functional. Outlets and switches must not be damaged.',
                    education: 'GFCI protection prevents electrocution in wet areas. AFCI prevents fires. Incorrect wiring can pose a shock hazard. A physically damaged outlet or switch with exposed components is a life-threatening electrocution risk and must be repaired immediately by a qualified electrician.',
                    defects: {
                        severe: [{ description: 'GFCI/AFCI inop', weight: 0.65 }, { description: 'GFCI missing', weight: 0.65 }, { description: 'Ungrounded/incorrectly wired outlet', weight: 0.65 }, { description: 'Outlet not energized', weight: 0.65 }, { description: 'Outlet/switch is damaged - no longer safe', weight: 2.50, lt: true }]
                    }
                },
                {
                    name: 'Wires & Conductors',
                    requirement: 'All electrical wiring must be fully shielded, enclosed, and protected from damage or exposure.',
                    education: 'Exposed wires or internal components of any electrical fixture present an immediate and severe risk of electrocution or fire. This is a zero-tolerance, life-threatening hazard. Covers must be intact, boxes closed, and insulation undamaged. Water in contact with electricity is an extreme danger. This requires immediate de-energizing of the circuit and repair by a licensed electrician.',
                    defects: {
                        severe: [{ description: 'Damaged or missing cover (includes wall mounted lights)', weight: 2.50, lt: true }, { description: 'Missing knockout', weight: 2.50, lt: true }, { description: 'Open breaker port', weight: 2.50, lt: true }, { description: '>1/2" gap noted', weight: 2.50, lt: true }, { description: 'Exposed wire nuts', weight: 2.50, lt: true }, { description: 'Unshielded wires noted (damaged covering)', weight: 2.50, lt: true }, { description: 'Water in contact with conductors', weight: 2.50, lt: true }]
                    }
                }
            ]
        },
        {
            category: 'Utilities',
            items: [
                {
                    name: 'Dryer Vent',
                    requirement: 'Dryer vent ducts must be made of metal, be securely connected, and be free of kinks or improvised filters.',
                    education: 'Plastic or foil ducts are flammable and prohibited. A disconnected or damaged vent can release moist air and lint into the wall cavity, promoting mold growth. Kinks restrict airflow. Improvised filters (like socks) are a severe fire hazard. These are all life-threatening conditions due to the high risk of a lint fire.',
                    defects: {
                        severe: [{ description: 'Non-metal duct utilized', weight: 2.50, lt: true }, { description: 'Vent missing, detached or damaged', weight: 2.50, lt: true }, { description: 'Improvised vent filter (cloth, sock, stocking, etc.)', weight: 2.50, lt: true }, { description: 'Kink restricts flow', weight: 2.50, lt: true }]
                    }
                },
                {
                    name: 'Floor Drain',
                    requirement: 'Floor drains must be clear and allow for water to drain.',
                    education: 'A clogged floor drain can lead to flooding and water damage in the event of a leak from a water heater or other appliance. It should be kept clear of debris and tested to ensure it drains properly.',
                    defects: {
                        moderate: [{ description: 'Standing water in contact with existing drain', weight: 0.23 }]
                    }
                },
                {
                    name: 'HVAC',
                    requirement: 'The primary heating source must be operational and able to maintain a temperature of at least 68°F during the heating season (Oct 1 - Mar 31).',
                    education: 'Lack of heat in winter is a life-threatening health and safety issue. Damaged flues can leak carbon monoxide. Missing covers on combustion chambers or baseboard heaters expose dangerously hot surfaces or electrical components. An unvented fuel-burning space heater is a deadly carbon monoxide hazard and is strictly prohibited.',
                    defects: {
                        low: [{ description: 'Cooling system inoperable (Between Apr 1 & Sep 30)', weight: 0.1 }],
                        moderate: [{ description: 'Heat inoperable (Between Apr 1 & Sep 30)', weight: 0.23 }],
                        severe: [{ description: 'Heat inoperable (Between Oct 1 & Mar 31)', weight: 2.50, lt: true }, { description: "Heat working but can't maintain 68 degrees", weight: 0.65 }, { description: 'Shield damaged/miss (baseboard, etc.)', weight: 0.65 }, { description: 'Flue is misaligned or restricted/holes', weight: 2.50, lt: true }, { description: 'Combustion chamber cover missing', weight: 2.50, lt: true }, { description: 'Gas shut off valve missing/incomplete', weight: 2.50, lt: true }, { description: 'Unvented fuel burning heater', weight: 2.50, lt: true }]
                    }
                },
                {
                    name: 'Leaks and Wastewater',
                    requirement: 'There must be no leaks from gas lines or plumbing/sewage systems.',
                    education: 'A gas or oil leak is an extreme fire and explosion hazard and is a life-threatening emergency requiring immediate evacuation and a call to the utility company. Backed-up sewage or a sewage leak is a serious health hazard. Water leaks must also be repaired to prevent mold and structural damage.',
                    defects: {
                        moderate: [{ description: 'Plumbing leaks noted into unintended areas (includes sprinklers)', weight: 0.23 }, { description: 'Environmental water intrusion', weight: 0.23 }, { description: 'Cleanout cover damaged or missing', weight: 0.23 }],
                        severe: [{ description: 'Evidence of gas, propane/oil leak at main, appliance, etc.', weight: 2.50, lt: true }, { description: 'Sewage leak', weight: 0.65 }, { description: 'Sewage backed up', weight: 0.65 }]
                    }
                },
                {
                    name: 'Light Fixtures',
                    requirement: 'Bathrooms and kitchens must have a permanent, functional light fixture.',
                    education: 'Permanent lighting in these key areas is a basic safety requirement, preventing reliance on extension cords or temporary lamps. All fixtures should be securely mounted to the ceiling or wall; a loose fixture is a hazard that could fall or indicate an unsafe electrical connection.',
                    defects: {
                        moderate: [{ description: 'Fixture inoperable', weight: 0.23 }, { description: 'Permanent fixture not present in bath and kitchen', weight: 0.23 }, { description: 'Fixture not securely mounted', weight: 0.23 }]
                    }
                },
                {
                    name: 'Water Heater',
                    requirement: 'The unit must have a supply of hot water, and the water heater must have all safety features intact and functional.',
                    education: 'Lack of hot water is a major habitability issue. The Temperature and Pressure Relief (TPR) valve is a critical safety device that prevents the tank from exploding if it overheats. Its discharge pipe must be of the correct material (metal), slope downwards, and not be capped or blocked in any way. A malfunctioning flue can leak carbon monoxide. These are all serious or life-threatening issues.',
                    defects: {
                        moderate: [{ description: 'TPR discharge pipe is less than 2" or more than 6" from floor or top of waste receptor/floor', weight: 0.23 }],
                        severe: [{ description: 'TPR valve leaking', weight: 0.65 }, { description: 'TPR discharge pipe is incorrect material', weight: 0.65 }, { description: 'TPR valve blocked - cannot fully actuate', weight: 0.65 }, { description: 'TPR discharge pipe has upward slope or is damaged or capped', weight: 0.65 }, { description: 'No hot water noted', weight: 0.65 }, { description: 'Flue misaligned/blocked', weight: 2.50, lt: true }, { description: 'Gas shut off valve missing/incomplete', weight: 2.50, lt: true }]
                    }
                }
            ]
        },
        {
            category: 'Fire Safety',
            items: [
                {
                    name: 'Carbon Monoxide Detector',
                    requirement: 'Carbon monoxide (CO) detectors must be present and operational in units with fuel-burning appliances or attached garages.',
                    education: 'CO is an invisible, odorless, and deadly gas produced by incomplete combustion. A working CO detector is the only way to be alerted to its presence. Missing, blocked, or inoperable detectors are a life-threatening deficiency and must be corrected immediately.',
                    defects: {
                        severe: [{ description: 'Missing detector', weight: 0.0, lt: true }, { description: 'Detector obstructed', weight: 0.0, lt: true }, { description: 'Detector inoperable', weight: 0.0, lt: true }]
                    }
                },
                {
                    name: 'Smoke Detector',
                    requirement: 'Smoke detectors must be present in required locations (sleeping areas, etc.), be unobstructed, and be operational.',
                    education: 'A working smoke detector is one of the most important safety devices in a home, providing early warning of a fire when occupants are asleep. A missing, blocked, or non-functional detector is a critical life-threatening issue. They must be tested regularly and batteries replaced.',
                    defects: {
                        severe: [{ description: 'Missing/not installed', weight: 0.0, lt: true }, { description: 'Inoperable', weight: 0.0, lt: true }, { description: 'Detector obstructed', weight: 0.0, lt: true }]
                    }
                },
                {
                    name: 'Chimney',
                    requirement: 'Chimneys, flues, and fireboxes must be structurally sound and free from damage.',
                    education: 'A damaged chimney or flue can allow dangerous combustion gases (like carbon monoxide) into the unit or hot embers to escape and cause a fire. This is a life-threatening hazard that requires immediate inspection and repair by a qualified professional.',
                    defects: {
                        severe: [{ description: 'Chimney/flue/firebox no longer safe', weight: 2.50, lt: true }]
                    }
                },
                {
                    name: 'Exit Signs',
                    requirement: 'Exit signs in common areas must be present, illuminated, and fully visible.',
                    education: 'In a fire, smoke can cause panic and disorientation. Illuminated exit signs are essential for guiding people to safety. If a sign is missing, unlit, or blocked, it fails its life-saving purpose. The backup battery must also be functional. This is a critical life-threatening deficiency.',
                    defects: {
                        severe: [{ description: 'Obscured from view (décor, plants, etc.)', weight: 2.50, lt: true }, { description: 'Not securely attached', weight: 2.50, lt: true }, { description: 'Missing where evidence of previous install', weight: 2.50, lt: true }, { description: 'No illumination (either internal or adjacent)', weight: 2.50, lt: true }, { description: 'Test button inop', weight: 2.50, lt: true }]
                    }
                },
                {
                    name: 'Egress',
                    requirement: 'All occupied rooms and the building itself must have a clear, unobstructed path for escape in an emergency.',
                    education: 'A blocked exit is a death trap in a fire. This could be a locked gate, a window that is painted shut, or a door blocked by furniture. Every resident must have a way out. This is a fundamental, life-threatening safety requirement. All exit paths must be kept clear.',
                    defects: {
                        severe: [{ description: 'Egress point from room or building is limited or blocked', weight: 2.50, lt: true }]
                    }
                },
                {
                    name: 'Fire Extinguisher',
                    requirement: 'Fire extinguishers must be present where required, fully charged, inspected, and in good condition.',
                    education: 'A fire extinguisher must be ready to use at a moment\'s notice. An undercharged, damaged, or expired extinguisher is unreliable. Ensure gauges are in the green and inspection tags are current. This is a life-threatening safety failure if the device is not ready for an emergency.',
                    defects: {
                        severe: [{ description: 'Under/over charged', weight: 2.50, lt: true }, { description: 'Missing with evidence of prior installation', weight: 2.50, lt: true }, { description: 'Rechargeable: Missing or expired tag', weight: 2.50, lt: true }, { description: 'Damage impacting function', weight: 2.50, lt: true }, { description: 'Disposable: Extinguisher >12 years old', weight: 2.50, lt: true }]
                    }
                },
                {
                    name: 'Flammable & Combustible Items',
                    requirement: 'Flammable or combustible materials must not be stored near ignition sources.',
                    education: 'Items like gasoline, propane, or even piles of paper can ignite easily if stored too close to a heat source like a furnace or water heater. This creates a severe and immediate fire hazard. A 3-foot clearance must be maintained. This is a critical life-threatening condition.',
                    defects: {
                        severe: [{ description: 'Flammable/combustible items within 3 feet of heat source', weight: 2.50, lt: true }, { description: 'Petroleum product (gas, propane, etc.)', weight: 2.50, lt: true }]
                    }
                },
                {
                    name: 'Sprinkler Assembly',
                    requirement: 'Fire sprinkler heads must be unobstructed, undamaged, and free of foreign materials.',
                    education: 'Fire sprinklers are a critical life-saving system. Anything blocking the spray pattern (like items stored within 18") prevents them from working effectively. Paint or corrosion on the head can delay or prevent its activation. These are serious, life-threatening fire safety impairments.',
                    defects: {
                        severe: [{ description: 'Obstructions placed within 18" of head', weight: 2.50, lt: true }, { description: 'Significant paint/foreign material noted on 75% of assembly', weight: 2.50, lt: true }, { description: 'Escutcheon / concealed cover plate missing', weight: 2.50 }, { description: 'Assembly damaged or corroded', weight: 2.50 }]
                    }
                }
            ]
        },
        {
            category: 'General Safety',
            items: [
                {
                    name: 'Auxiliary Lights',
                    requirement: 'Emergency auxiliary lighting must be present and operational.',
                    education: 'During a power outage, especially in a windowless common area like a hallway or stairwell, emergency lighting is critical to prevent panic and injury by illuminating paths of egress. These fixtures must be tested to ensure their batteries and bulbs are functional.',
                    defects: {
                        severe: [{ description: 'Missing or inoperable', weight: 0.65 }]
                    }
                },
                {
                    name: 'Call-For-Aid',
                    requirement: 'Emergency call-for-aid systems must be installed correctly and be fully operational.',
                    education: 'These systems are a lifeline for elderly or disabled residents, allowing them to summon help in an emergency. The pull cord must be reachable (not tied up or blocked) and the system must signal the correct location. A non-functional system provides a false sense of security and is a life-threatening failure.',
                    defects: {
                        severe: [{ description: 'Sound/light inop or indicates wrong room', weight: 2.50, lt: true }, { description: "Cord missing or tied short (can't engage)", weight: 2.50, lt: true }, { description: 'System/cord blocked or >6" from floor', weight: 0.0 }]
                    }
                },
                {
                    name: 'Guardrails',
                    requirement: 'Guardrails must be present at all drops of 30 inches or more, be of the correct height, and be structurally sound.',
                    education: 'Guardrails are the primary protection against falls from elevated surfaces. A missing, short, or damaged guardrail is a life-threatening hazard, as a fall from such a height can be fatal or cause severe injury. All components must be secure and intact.',
                    defects: {
                        severe: [{ description: 'Guardrail is missing where required', weight: 2.50, lt: true }, { description: 'Guardrail too short', weight: 2.50 }, { description: 'Missing/loose impacting function', weight: 2.50 }]
                    }
                },
                {
                    name: 'Handrails',
                    requirement: 'Handrails must be present where required, securely installed, and constructed to be graspable and safe.',
                    education: 'Handrails are critical for preventing falls, especially on stairs. A loose handrail can fail under pressure, leading to serious injury. Ensure they are anchored securely and all components are intact.',
                    defects: {
                        low: [{ description: 'Handrail is missing where needed without evidence of previous installation', weight: 0.0 }],
                        moderate: [{ description: 'Handrail loose', weight: 0.23 }, { description: 'Missing with evidence of previous install', weight: 0.0 }, { description: 'Incorrect installation', weight: 0.23 }]
                    }
                },
                {
                    name: 'Infestation',
                    requirement: 'The property must be free from evidence of pest infestations.',
                    education: 'Cockroaches, bedbugs, and rodents are not just a nuisance; they pose significant health risks by spreading disease, contaminating food, and triggering allergies/asthma. Extensive infestation requires professional pest control treatment and is considered a life-threatening health hazard.',
                    defects: {
                        moderate: [{ description: 'Evidence of roaches', weight: 0.23 }, { description: 'Evidence of bedbugs', weight: 0.23 }, { description: 'Evidence of mice/rats', weight: 0.23 }, { description: 'Evidence of other pests (ants, bees, etc.)', weight: 0.23 }],
                        severe: [{ description: 'Extensive infestation (1 live rat seen within building)', weight: 2.50, lt: true }]
                    }
                },
                {
                    name: 'Lead-based Paint',
                    requirement: 'For pre-1978 properties, painted surfaces must be intact and free from deterioration.',
                    education: 'Deteriorating lead-based paint creates toxic dust that is extremely hazardous, especially to children, causing permanent neurological damage. Any chipping, peeling, or chalking paint must be addressed using lead-safe work practices by certified professionals. This is a life-threatening health hazard.',
                    defects: {
                        moderate: [{ description: 'Large surfaces: <=2sf of paint deteriorating - per room', weight: 0.23 }, { description: 'Small surfaces: <10% deterioration - per component', weight: 0.23 }],
                        severe: [{ description: 'Large surfaces: >2sf of paint deteriorating - per room', weight: 2.50, lt: true }, { description: 'Small surfaces:>10% deterioration - per component', weight: 2.50, lt: true }]
                    }
                },
                {
                    name: 'Mold-Like Substance',
                    requirement: 'Surfaces should be free from significant amounts of mold-like substances.',
                    education: 'Mold growth is often a symptom of a water leak or high humidity. While a small amount can be cleaned, larger areas can cause respiratory problems and other health issues. The presence of more than 9 sq feet is considered a life-threatening health hazard and the underlying moisture problem must be fixed.',
                    defects: {
                        low: [{ description: 'Elevated moisture levels noted >4 sq inches noted', weight: 0.1 }],
                        moderate: [{ description: '>1 sq foot noted', weight: 0.23 }],
                        severe: [{ description: '>9 sq feet of "mold"', weight: 2.50, lt: true }]
                    }
                },
                {
                    name: 'Sharp Edges',
                    requirement: 'The property must be free from sharp edges on building components that could cause serious injury.',
                    education: 'Exposed, sharp edges on counters, broken tiles, or damaged fixtures can cause deep lacerations requiring medical attention. These hazards must be repaired, replaced, or shielded to prevent injury.',
                    defects: {
                        severe: [{ description: 'Sharp edge noted (likely require professional medical treatment)', weight: 0.65 }]
                    }
                },
                {
                    name: 'Trip Hazard',
                    requirement: 'Walking surfaces must be even and free of significant vertical or horizontal gaps.',
                    education: 'Even small changes in elevation can cause a serious fall. This includes buckled flooring, raised thresholds, or cracked tiles. All walking surfaces should be inspected and repaired to eliminate these hazards.',
                    defects: {
                        moderate: [{ description: '1/4 inch vertical deviation', weight: 0.23 }, { description: '2-inch horizontal separation', weight: 0.23 }]
                    }
                }
            ]
        },
        {
            category: 'Structures and Finishes',
            items: [
                {
                    name: 'Ceilings',
                    requirement: 'Ceilings must be structurally sound and free from large holes or instability.',
                    education: 'A sagging or deflecting ceiling indicates a potential structural problem or a serious leak from above. Large holes compromise the fire barrier between floors and can allow pests to travel. Such conditions warrant immediate investigation and repair.',
                    defects: {
                        moderate: [{ description: 'Unstable surface noted (deflection, etc.)', weight: 0.23 }, { description: 'Hole noted (>=2" diameter)', weight: 0.23 }],
                        severe: [{ description: 'Ceiling not functionally adequate (large section missing, etc.)', weight: 0.65 }]
                    }
                },
                {
                    name: 'Walls',
                    requirement: 'Walls must be intact and free of large holes.',
                    education: 'Holes in walls are unsightly, can allow pest entry, and if they penetrate to an adjoining space, they compromise the fire and sound barrier between units. Damaged or detached coverings should be repaired to maintain the integrity of the wall.',
                    defects: {
                        moderate: [{ description: '>2" hole or cumulative holes in one wall >6"x6"', weight: 0.23 }, { description: 'Any size hole penetrating into adjoining space', weight: 0.23 }, { description: 'Detached covering', weight: 0.23 }]
                    }
                },
                {
                    name: 'Floor Covering & Finish',
                    requirement: 'Flooring must be present and the floor structure must be sound.',
                    education: 'Missing flooring that exposes the subfloor can be a trip hazard and difficult to clean. A floor structure that is sloped or feels soft and spongy indicates a serious underlying problem, such as rotted joists, that could lead to collapse. This requires immediate structural assessment.',
                    defects: {
                        moderate: [{ description: '>=10% of flooring missing - exposing substrate', weight: 0.23 }, { description: 'Floor structure sloped, rotted (not functionally adequate)', weight: 0.23 }]
                    }
                },
                {
                    name: 'Foundation (Basement)',
                    requirement: 'The foundation must be sound and the area must be free from water penetration.',
                    education: 'Water in a basement or crawlspace promotes mold and can lead to structural rot. Large cracks, exposed rebar, or crumbling concrete can indicate serious structural issues. Any sign of a possible structural problem warrants evaluation by a qualified engineer.',
                    defects: {
                        moderate: [{ description: 'Evidence of water penetration', weight: 0.23 }, { description: 'Crack >=1/4" x 12"', weight: 0.23 }, { description: 'Exposed rebar noted', weight: 0.23 }, { description: 'Spalling/flaking noted - 12" x 12" x 3/4" deep', weight: 0.23 }, { description: 'Rot/damage noted to post, girder, etc.', weight: 0.23 }],
                        severe: [{ description: 'Possible structural concern noted', weight: 0.65 }]
                    }
                },
                {
                    name: 'Stairs and steps',
                    requirement: 'Stairs must have all treads present, level, and structurally sound.',
                    education: 'Damaged or missing components on a staircase can lead directly to severe falls and injuries. Loose treads, damaged nosing, or a compromised stringer can all cause a misstep and must be repaired immediately to ensure user safety.',
                    defects: {
                        moderate: [{ description: 'Missing tread', weight: 0.23 }, { description: 'Loose or unlevel tread', weight: 0.23 }, { description: 'Nosing damage >1" deep or 4" wide', weight: 0.23 }, { description: 'Stringer damaged (rot, severe cracks, etc.)', weight: 0.23 }]
                    }
                },
                {
                    name: 'Elevator',
                    requirement: 'Elevators must be operational with a current safety certificate and all safety features functioning.',
                    education: 'For many residents, especially the elderly or those with disabilities, an inoperable elevator is a major barrier. Safety features like the door reverse and level alignment with the floor are critical to prevent injury. A valid certificate indicates it has been professionally inspected.',
                    defects: {
                        moderate: [{ description: 'Inoperable', weight: 0.23 }, { description: 'Door does not fully open on each floor', weight: 0.23 }, { description: '>3/4" height difference between cab and floor', weight: 0.23 }, { description: 'Safety reverse inoperable', weight: 0.23 }, { description: 'Certificate expired or unavailable', weight: 0.23 }]
                    }
                },
                {
                    name: 'Litter',
                    requirement: 'Common areas must be free of litter and debris.',
                    education: 'Litter in common areas is unsightly and can attract pests. It is the property\'s responsibility to ensure these areas are kept clean through regular maintenance and by providing adequate trash receptacles.',
                    defects: {
                        moderate: [{ description: '10 small items (food wrapper, paper, etc.) noted within 100sf area', weight: 0.23 }, { description: 'Any large item discarded incorrectly (furniture, etc.)', weight: 0.23 }]
                    }
                },
                {
                    name: 'Structural Defects',
                    requirement: 'All structural members must be sound and not appear in danger of collapse.',
                    education: 'This is a catch-all for any obvious, severe structural problem, such as a failing roof truss, a collapsing balcony, or a severely bowing wall. Any such observation indicates a life-threatening situation and requires immediate evacuation of the area and assessment by a structural engineer.',
                    defects: {
                        severe: [{ description: 'Any structural member appearing in danger of collapse/failure', weight: 2.50, lt: true }]
                    }
                },
                {
                    name: 'Trash Chute',
                    requirement: 'Trash chute doors must self-close and latch properly.',
                    education: 'A properly functioning trash chute door is a critical fire safety feature. It prevents a fire that starts in the chute from spreading to residential floors. It also helps contain odors. An inoperable door or a chute blocked with trash defeats these purposes.',
                    defects: {
                        moderate: [{ description: 'Self-closure or latch inoperable', weight: 0.23 }, { description: 'Trash in chute', weight: 0.23 }]
                    }
                },
                {
                    name: 'Window',
                    requirement: 'Windows must be intact and fully operational (open, close, and lock).',
                    education: 'Windows provide light, ventilation, and in some cases, a secondary means of egress. A window that cannot close or has broken panes compromises security and weather protection. One that won\'t open prevents ventilation. Screens are needed to keep insects out. All components should be functional.',
                    defects: {
                        low: [{ description: 'Lock inoperable or window will not open or stay open', weight: 0.1 }],
                        moderate: [{ description: 'Screen with 1" or larger damage or missing', weight: 0.23 }, { description: 'Pane/sash is missing or damaged (cracks, weatherstrip, etc. that impacts function)', weight: 0.23 }, { description: 'Window will not close', weight: 0.23 }]
                    }
                }
            ]
        }
    ],
    unit: [
        {
            category: 'Bathroom Kitchen | Laundry',
            items: [
                {
                    name: 'Bath Ventilation',
                    requirement: 'Bathrooms must have a functional mechanical exhaust fan or an operable window.',
                    education: 'Proper ventilation is crucial to remove moisture, which prevents the growth of mold and mildew and reduces damage to walls and ceilings. If there is no window, the fan must be present, clear of obstructions, and operational.',
                    defects: {
                        moderate: [{ description: 'Inop or missing and no window present', weight: 0.25 }, { description: 'Missing or damaged vent cover', weight: 0.25 }, { description: 'Obstruction noted', weight: 0.25 }]
                    }
                },
                {
                    name: 'Cabinets',
                    requirement: 'Cabinets should be functional and in good condition.',
                    education: 'Damaged cabinets can be difficult to use and may pose a hazard if they detach from the wall. Significant damage warrants repair to ensure the space is fully usable for storage.',
                    defects: {
                        moderate: [{ description: '50% of cabinets or components missing/ damaged/inop', weight: 0.25 }]
                    }
                },
                {
                    name: 'Countertops',
                    requirement: 'There must be adequate and sanitary food storage and preparation areas.',
                    education: 'Kitchens require a non-porous, cleanable surface for safe food preparation. A countertop with an exposed substrate cannot be properly sanitized. Lack of storage or prep areas makes sanitary cooking difficult. The surface must be "functionally adequate."',
                    defects: {
                        moderate: [{ description: 'No food storage area noted', weight: 0.25 }, { description: 'No food prep area', weight: 0.25 }, { description: '>=10% of top has exposed substrate', weight: 0.25 }, { description: "Not functionally adequate (can't be sanitized, etc.)", weight: 0.25 }]
                    }
                },
                {
                    name: 'Dryer Vent',
                    requirement: 'Dryer vent ducts must be made of metal, be securely connected, and be free of kinks or improvised filters.',
                    education: 'Plastic or foil ducts are flammable and prohibited. A disconnected vent can release moist air and lint into walls, promoting mold. Kinks restrict airflow. Improvised filters are a severe fire hazard. These are all life-threatening conditions due to the high risk of a lint fire.',
                    defects: {
                        severe: [{ description: 'Non-metal duct utilized', weight: 2.75, lt: true }, { description: 'Vent missing, detached or damaged', weight: 2.75, lt: true }, { description: 'Improvised vent filter (cloth, sock, etc.)', weight: 2.75, lt: true }, { description: 'Kink restricts flow', weight: 2.75, lt: true }]
                    }
                },
                {
                    name: 'Grab Bars',
                    requirement: 'Grab bars, where installed, must be securely anchored.',
                    education: 'Grab bars are safety devices. A loose grab bar is a serious hazard, as it can pull out of the wall when needed most, leading to a severe fall. They must be anchored into solid blocking.',
                    defects: {
                        moderate: [{ description: 'Slightly loose', weight: 0.25 }]
                    }
                },
                {
                    name: 'Refrigerator',
                    requirement: 'A refrigerator must be provided and must keep food adequately cool.',
                    education: 'A refrigerator is essential for safe food storage. If it cannot maintain a cold temperature, food will spoil, posing a health risk. The unit should be repaired or replaced.',
                    defects: {
                        moderate: [{ description: 'Not cooling adequately', weight: 0.25 }, { description: 'Seal sagging, torn or detached impacting function', weight: 0.25 }, { description: 'Component damaged or missing (handle, drawers, etc.) impacting function', weight: 0.25 }]
                    }
                },
                {
                    name: 'Kitchen Ventilation',
                    requirement: 'A kitchen must have a functional ventilation system (range hood or exhaust fan).',
                    education: 'Kitchen ventilation removes smoke, grease, and odors. A missing filter can allow grease to build up in the ductwork, creating a fire hazard. An inoperable or blocked vent fails to perform its function.',
                    defects: {
                        moderate: [{ description: 'Filter missing or damaged', weight: 0.25 }, { description: 'Vent is inoperable or part or/fully blocked', weight: 0.25 }, { description: 'Exhaust duct not securely attached or missing', weight: 0.25 }]
                    }
                },
                {
                    name: 'Range / Oven',
                    requirement: 'A functional cooking appliance (range/oven) must be provided.',
                    education: 'A unit must have a working appliance for cooking meals. If the entire appliance or all burners/oven are inoperable, it is a severe deficiency. A missing appliance is also a severe issue. The appliance must be functional.',
                    defects: {
                        moderate: [{ description: 'Component missing', weight: 0.25 }, { description: '1 burner or more not producing heat', weight: 0.25 }, { description: 'Appliance missing', weight: 0.25 }],
                        severe: [{ description: '100% of burners or oven not producing heat', weight: 0.7 }]
                    }
                },
                {
                    name: 'Shower/Tub & Hardware',
                    requirement: 'A tub or shower must be provided, be fully operational, and allow for privacy.',
                    education: 'A functioning bathing facility is a basic sanitation requirement. If the tub/shower is completely inoperable (e.g., no water, severe damage) or the drain is fully clogged, it is a severe deficiency. The entire assembly must be in good working order.',
                    defects: {
                        low: [{ description: 'Component (stopper, curtain, etc.) damaged or missing and does NOT impact function', weight: 0.1 }, { description: '<50% discoloration', weight: 0.1 }],
                        moderate: [{ description: 'Component (diverter, head, leak, handle, door, etc.) damaged/impacts function', weight: 0.25 }, { description: '>=50% discoloration', weight: 0.25 }, { description: "Shower or tub can't be used in private", weight: 0.25 }],
                        severe: [{ description: 'Tub/shower is inoperable', weight: 0.7 }, { description: 'Drain fully clogged', weight: 0.7 }]
                    }
                },
                {
                    name: 'Sink',
                    requirement: 'Sinks must be functional, with operable handles and proper drainage.',
                    education: 'Sinks are essential for hygiene. A sink that is damaged and won\'t hold water, has missing handles, or a clogged drain is not functional. A sink pulling away from the wall can lead to a major leak.',
                    defects: {
                        low: [{ description: 'Missing or inoperable stopper/strainer', weight: 0.1 }, { description: 'Leak outside of basin (around handles, etc.)', weight: 0.1 }],
                        moderate: [{ description: 'Missing or inoperable handles', weight: 0.25 }, { description: "Won't hold water (sink damaged)", weight: 0.25 }, { description: 'Drain clogged', weight: 0.25 }, { description: 'Pulled away from wall', weight: 0.25 }]
                    }
                },
                {
                    name: 'Toilet',
                    requirement: 'A toilet must be present, be securely mounted, and flush/refill correctly.',
                    education: 'A functioning toilet is a fundamental sanitation requirement. A missing toilet is a life-threatening health hazard. One that doesn\'t flush properly or is loose at its base is a severe deficiency that can cause major water damage and unsanitary conditions.',
                    defects: {
                        low: [{ description: 'Continues to "run" after flushing', weight: 0.1 }, { description: 'Tank lid, etc. damaged or missing - does not impact function', weight: 0.1 }],
                        moderate: [{ description: 'Seat or flush handle is broken, loose or missing - impacts function', weight: 0.25 }, { description: 'Base is not secure', weight: 0.25 }, { description: "Toilet can't be used in private", weight: 0.25 }],
                        severe: [{ description: 'Toilet missing', weight: 2.75, lt: true }, { description: "Doesn't flush or refill correctly", weight: 0.70 }]
                    }
                }
            ]
        },
        {
            category: 'Doors',
            items: [
                {
                    name: 'Garage Door',
                    requirement: 'Garage doors must be structurally intact and operate correctly and safely.',
                    education: 'A malfunctioning garage door is a security and safety risk. Holes compromise security. Inoperable doors can trap vehicles. Ensure all components are in good working order.',
                    defects: {
                        moderate: [{ description: 'Penetrating hole', weight: 0.25 }, { description: "Door won't open, stay open, close, etc.", weight: 0.25 }]
                    }
                },
                {
                    name: 'General Door (Passage)',
                    requirement: 'Interior doors must be present and operable to ensure privacy.',
                    education: 'Interior doors for bedrooms and bathrooms are essential for privacy. A missing door, or one that cannot be closed, fails to provide this function. A door stuck shut can be a hazard.',
                    defects: {
                        low: [{ description: 'Inoperable/missing or damage compromises privacy', weight: 0.1 }],
                        moderate: [{ description: "Passage door won't open", weight: 0.25 }]
                    }
                },
                {
                    name: 'Fire Rated Door',
                    requirement: 'Fire-rated doors must be fully functional with all fire-rated components intact.',
                    education: 'A fire door slows the spread of fire and smoke. It MUST latch securely and its self-closer MUST pull it shut. Any holes, damaged seals, or broken hardware defeats its purpose. A missing fire door is a life-threatening deficiency.',
                    defects: {
                        severe: [{ description: "Hardware inop/missing or door won't latch", weight: 0.7 }, { description: 'Self-closure inop', weight: 0.7 }, { description: 'Any size hole noted', weight: 0.7 }, { description: 'Assembly damaged (glass, frame, etc.)', weight: 0.7 }, { description: 'Door propped open', weight: 0.7 }, { description: 'Seal damaged/miss', weight: 0.7 }, { description: 'Missing fire door', weight: 2.75, lt: true }]
                    }
                },
                {
                    name: 'Entry Door',
                    requirement: 'Primary entry doors must provide security and be weather-tight.',
                    education: 'The entry door is critical for security. If it is missing, cannot be locked, or will not close, the unit is not secure. This is a severe deficiency. The entire door assembly must function correctly to protect residents.',
                    defects: {
                        low: [{ description: 'Secondary latch/lock or other non-impacting issues (deadbolt, strike plate, etc.)', weight: 0.1 }, { description: 'Door glass damaged (cracked, fogged, etc.)', weight: 0.1 }],
                        moderate: [{ description: '>=1/4" crack or hole penetrating through door or frame', weight: 0.25 }, { description: 'Self-closing hardware missing/inoperable', weight: 0.25 }, { description: 'Delamination >2"', weight: 0.25 }, { description: 'Seal miss/damaged with >=1/4" gap or evidence of moisture penetration', weight: 0.25 }, { description: 'Frame/trim damaged impacting function', weight: 0.25 }],
                        severe: [{ description: 'Inoperable locking (unable to secure)', weight: 0.7 }, { description: 'Door missing', weight: 2.75, lt: true }, { description: "Door won't close (hits frame)", weight: 0.7 }]
                    }
                }
            ]
        },
        {
            category: 'Electrical',
            items: [
                {
                    name: 'Enclosures',
                    requirement: 'Electrical panels must be accessible, free from water/damage, and all components must be intact.',
                    education: 'Water and rust inside a panel create a severe risk of fire and electrocution. Damaged breakers can fail to trip. These are life-threatening conditions requiring immediate electrician attention.',
                    defects: {
                        moderate: [{ description: 'Service/breaker panel is blocked or difficult to access', weight: 0.25 }],
                        severe: [{ description: 'Water intrusion, rust, or foreign substance over breakers/fuse', weight: 0.7 }, { description: 'Damaged breakers', weight: 2.75, lt: true }, { description: 'Foreign material used in repair', weight: 0.7 }]
                    }
                },
                {
                    name: 'Outlets / Switches & GFCI/AFCI',
                    requirement: 'Outlets must be properly wired and functional. GFCI/AFCI protection must work. Outlets/switches must not be damaged.',
                    education: 'GFCI protection prevents electrocution. AFCI prevents fires. A physically damaged outlet with exposed components is a life-threatening electrocution risk and must be repaired immediately by a qualified electrician.',
                    defects: {
                        severe: [{ description: 'GFCI/AFCI inop', weight: 0.7 }, { description: 'GFCI missing', weight: 0.7 }, { description: 'Ungrounded/incorrectly wired outlet', weight: 0.7 }, { description: 'Outlet not energized', weight: 0.7 }, { description: 'Outlet/switch is damaged - no longer safe', weight: 2.75, lt: true }]
                    }
                },
                {
                    name: 'Wires & Conductors',
                    requirement: 'All electrical wiring must be fully shielded, enclosed, and protected from damage or exposure.',
                    education: 'Exposed wires present an immediate and severe risk of electrocution or fire. This is a zero-tolerance, life-threatening hazard. Covers must be intact, boxes closed, and insulation undamaged. This requires immediate repair by a licensed electrician.',
                    defects: {
                        severe: [{ description: 'Damaged or missing cover', weight: 2.75, lt: true }, { description: 'Missing knockout', weight: 2.75, lt: true }, { description: 'Open breaker port', weight: 2.75, lt: true }, { description: '>1/2" gap noted', weight: 2.75, lt: true }, { description: 'Exposed wire nuts', weight: 2.75, lt: true }, { description: 'Unshielded wires noted (damaged covering)', weight: 2.75, lt: true }, { description: 'Water in contact with conductors', weight: 2.75, lt: true }]
                    }
                },
                {
                    name: 'Minimum Electrical and Lighting',
                    requirement: 'Each habitable room must have at least two outlets, or one outlet and one permanent light fixture.',
                    education: 'This standard ensures that residents have adequate access to electricity without creating hazards by overloading circuits or relying on extension cords, which can create trip hazards and fire risks.',
                    defects: {
                        moderate: [{ description: 'Inhabitable room lacks 2 outlets or 1 outlet and 1 light', weight: 0.25 }]
                    }
                }
            ]
        },
        {
            category: 'Utilities',
            items: [
                {
                    name: 'Floor Drain',
                    requirement: 'Floor drains must be clear and allow for water to drain.',
                    education: 'A clogged floor drain can lead to flooding and water damage in the event of a leak from a nearby appliance. It should be kept clear of debris.',
                    defects: {
                        moderate: [{ description: 'Clogged', weight: 0.25 }]
                    }
                },
                {
                    name: 'HVAC',
                    requirement: 'The primary heating source must be operational and able to maintain at least 68°F during the heating season (Oct 1 - Mar 31).',
                    education: 'Lack of heat in winter is a life-threatening health and safety issue. Damaged flues can leak carbon monoxide. Missing covers expose dangerously hot surfaces. An unvented fuel-burning heater is a deadly carbon monoxide hazard and is prohibited.',
                    defects: {
                        moderate: [{ description: 'Heat inoperable (Between Apr 1 & Sep 30)', weight: 0.25 }, { description: 'Cooling system inoperable', weight: 0.25 }],
                        severe: [{ description: 'Heat inoperable (Between Oct 1 & Mar 31)', weight: 2.75, lt: true }, { description: "Heat working but can't maintain 68 degrees", weight: 0.7 }, { description: 'Shield damaged/miss (baseboard, etc.)', weight: 0.7 }, { description: 'Flue is misaligned or restricted/holes', weight: 2.75, lt: true }, { description: 'Combustion chamber cover missing', weight: 2.75, lt: true }, { description: 'Gas shut off valve missing/incomplete', weight: 2.75, lt: true }, { description: 'Unvented fuel burning heater', weight: 2.75, lt: true }]
                    }
                },
                {
                    name: 'Leaks and Wastewater',
                    requirement: 'There must be no leaks from gas lines or plumbing/sewage systems.',
                    education: 'A gas leak is an extreme fire and explosion hazard and is a life-threatening emergency. Backed-up sewage is a serious health hazard. Water leaks must be repaired to prevent mold and structural damage.',
                    defects: {
                        moderate: [{ description: 'Plumbing leaks into unintended areas', weight: 0.25 }, { description: 'Environmental water intrusion', weight: 0.25 }, { description: 'Cleanout cover damaged or missing', weight: 0.25 }],
                        severe: [{ description: 'Evidence of gas, propane/oil leak', weight: 2.75, lt: true }, { description: 'Sewage leak', weight: 0.7 }, { description: 'Sewage backed up', weight: 0.7 }]
                    }
                },
                {
                    name: 'Light Fixtures',
                    requirement: 'Bathrooms and kitchens must have a permanent, functional light fixture.',
                    education: 'Permanent lighting in these key areas is a basic safety requirement. All fixtures should be securely mounted; a loose fixture is a hazard that could fall or indicate an unsafe electrical connection.',
                    defects: {
                        moderate: [{ description: 'Fixture inoperable', weight: 0.25 }, { description: 'Fixture not present in bath or kitchen', weight: 0.25 }, { description: 'Fixture not securely mounted', weight: 0.25 }]
                    }
                },
                {
                    name: 'Water Heater',
                    requirement: 'The unit must have hot water, and the water heater\'s safety features must be intact.',
                    education: 'Lack of hot water is a major habitability issue. The Temperature and Pressure Relief (TPR) valve is a critical safety device that prevents explosion. Its discharge pipe must be installed correctly. A malfunctioning flue can leak carbon monoxide. These are all serious or life-threatening issues.',
                    defects: {
                        moderate: [{ description: 'TPR discharge pipe is less than 2" or more than 6" from floor or top of waste receptor/floor', weight: 0.25 }],
                        severe: [{ description: 'TPR valve leaking', weight: 0.7 }, { description: 'TPR discharge pipe is incorrect material', weight: 0.7 }, { description: 'TPR valve blocked - cannot fully actuate', weight: 0.7 }, { description: 'TPR discharge pipe has upward slope, damaged or capped/threaded', weight: 0.7 }, { description: 'No hot water noted', weight: 0.7 }, { description: 'Flue misaligned/blocked', weight: 2.75, lt: true }, { description: 'Gas shut off valve missing/incomplete', weight: 2.75, lt: true }]
                    }
                }
            ]
        },
        {
            category: 'Fire Safety',
            items: [
                {
                    name: 'Carbon Monoxide Detector',
                    requirement: 'CO detectors must be present and operational in units with fuel-burning appliances or attached garages.',
                    education: 'CO is an invisible, odorless, and deadly gas. A working CO detector is the only way to be alerted to its presence. Missing, blocked, or inoperable detectors are a life-threatening deficiency.',
                    defects: {
                        severe: [{ description: 'Missing detector', weight: 0.0, lt: true }, { description: 'Detector obstructed', weight: 0.0, lt: true }, { description: 'Detector inoperable', weight: 0.0, lt: true }]
                    }
                },
                {
                    name: 'Smoke Detector',
                    requirement: 'Smoke detectors must be present in required locations, be unobstructed, and be operational.',
                    education: 'A working smoke detector provides early warning of a fire. A missing, blocked, or non-functional detector is a critical life-threatening issue. They must be tested regularly.',
                    defects: {
                        severe: [{ description: 'Missing/not installed in proper location', weight: 0.0, lt: true }, { description: 'Inoperable', weight: 0.0, lt: true }, { description: 'Detector obstructed', weight: 0.0, lt: true }]
                    }
                },
                {
                    name: 'Chimney/ Fireplace',
                    requirement: 'Chimneys, flues, and fireboxes must be structurally sound and free from damage.',
                    education: 'A damaged chimney or flue can allow dangerous combustion gases (like carbon monoxide) into the unit or allow embers to escape and cause a fire. This is a life-threatening hazard.',
                    defects: {
                        severe: [{ description: 'Chimney/flue/firebox no longer safe', weight: 2.75, lt: true }]
                    }
                },
                {
                    name: 'Egress',
                    requirement: 'All bedrooms and the unit itself must have a clear, unblocked path for escape.',
                    education: 'A blocked exit is a death trap in a fire. This could be a window painted shut or a door blocked by furniture. Every resident must have a way out. This is a fundamental, life-threatening safety requirement.',
                    defects: {
                        severe: [{ description: '4th Floor & Above - Unit does not have at least 1 unblocked egress', weight: 2.75, lt: true }, { description: "First 3 Floors - Bedroom does not have at least one unblocked egress window-or- bedroom/unit entry doors blocked/won't open fully", weight: 2.75, lt: true }]
                    }
                },
                {
                    name: 'Fire Extinguisher',
                    requirement: 'Fire extinguishers must be present where required, fully charged, and in good condition.',
                    education: 'An undercharged, damaged, or expired extinguisher is unreliable in an emergency. This is a life-threatening safety failure if the device is not ready when needed.',
                    defects: {
                        severe: [{ description: 'Under/over charged', weight: 2.75, lt: true }, { description: 'Missing with evidence of prior installation', weight: 2.75, lt: true }, { description: 'Rechargeable: Missing or expired tag', weight: 2.75, lt: true }, { description: 'Damage impacting function', weight: 2.75, lt: true }, { description: 'Disposable: Extinguisher >12 years old', weight: 2.75, lt: true }]
                    }
                },
                {
                    name: 'Flammable & Combustible Items',
                    requirement: 'Flammable or combustible materials must not be stored near ignition sources.',
                    education: 'Items like gasoline, propane, or even piles of paper can ignite easily if stored too close to a heat source like a furnace or water heater. A 3-foot clearance must be maintained. This is a critical life-threatening condition.',
                    defects: {
                        severe: [{ description: 'Flammable/combustibles items within 3 feet of heat source', weight: 2.75, lt: true }, { description: 'Petroleum product (gas, propane, etc.)', weight: 2.75, lt: true }]
                    }
                },
                {
                    name: 'Sprinkler Assembly',
                    requirement: 'Fire sprinkler heads must be unobstructed, undamaged, and free of foreign materials.',
                    education: 'Sprinklers are a critical life-saving system. Anything blocking the spray pattern (within 18") prevents them from working effectively. Paint on the head can prevent its activation. These are serious, life-threatening fire safety impairments.',
                    defects: {
                        severe: [{ description: 'Obstructions placed within 18" of head', weight: 2.75, lt: true }, { description: 'Significant paint/foreign material noted on 75% of assembly', weight: 2.75, lt: true }, { description: 'Escutcheon / concealed cover plate missing', weight: 2.75, lt: true }, { description: 'Assembly damaged or corroded', weight: 2.75, lt: true }]
                    }
                }
            ]
        },
        {
            category: 'General Safety',
            items: [
                {
                    name: 'Call-For-Aid',
                    requirement: 'Emergency call-for-aid systems must be installed correctly and be fully operational.',
                    education: 'These systems are a lifeline for residents in need. The pull cord must be reachable and the system must signal the correct location. A non-functional system is a life-threatening failure.',
                    defects: {
                        severe: [{ description: 'Sound/light inoperable or indicates incorrectly', weight: 2.75, lt: true }, { description: "Cord missing or tied short (can't be engaged)", weight: 2.75, lt: true }, { description: 'System/cord blocked or >6" from floor', weight: 0.0, lt: true }]
                    }
                },
                {
                    name: 'Guardrails',
                    requirement: 'Guardrails must be present at all drops of 30 inches or more, be of the correct height, and be structurally sound.',
                    education: 'A missing, short, or damaged guardrail is a life-threatening hazard, as a fall from such a height can be fatal or cause severe injury. All components must be secure and intact.',
                    defects: {
                        severe: [{ description: 'Guardrail is missing where required', weight: 2.75, lt: true }, { description: 'Guardrail too short', weight: 2.75, lt: true }, { description: 'Missing/loose impacting function', weight: 2.75, lt: true }]
                    }
                },
                {
                    name: 'Handrails',
                    requirement: 'Handrails must be present where required and be securely installed.',
                    education: 'Handrails are critical for preventing falls on stairs. A loose handrail can fail under pressure, leading to serious injury. Ensure they are anchored securely.',
                    defects: {
                        low: [{ description: 'Handrail is missing where needed without evidence of previous installation', weight: 0.0 }],
                        moderate: [{ description: 'Handrail loose', weight: 0.25 }, { description: 'Missing with evidence of previous install', weight: 0.0 }, { description: 'Incorrect installation', weight: 0.25 }]
                    }
                },
                {
                    name: 'Infestation',
                    requirement: 'The unit must be free from evidence of pest infestations.',
                    education: 'Cockroaches, bedbugs, and rodents pose significant health risks. Extensive infestation requires professional pest control and is considered a life-threatening health hazard.',
                    defects: {
                        moderate: [{ description: 'Evidence of roaches', weight: 0.25 }, { description: 'Evidence of bedbugs', weight: 0.25 }, { description: 'Evidence of mice/rat', weight: 0.25 }, { description: 'Evidence of other pests (ants, bees, etc.)', weight: 0.25 }],
                        severe: [{ description: 'Extensive infestation (1 live roach, bedbug or mouse seen in 2 rooms)', weight: 2.75, lt: true }, { description: 'Extensive infestation (1 live rat seen)', weight: 2.75, lt: true }]
                    }
                },
                {
                    name: 'Lead-based Paint',
                    requirement: 'For pre-1978 properties, painted surfaces must be intact and free from deterioration.',
                    education: 'Deteriorating lead-based paint creates toxic dust that is extremely hazardous, especially to children. Any chipping or peeling paint must be addressed using lead-safe work practices. This is a life-threatening health hazard.',
                    defects: {
                        moderate: [{ description: 'Large surfaces: <=2sf of paint deteriorating - per room', weight: 0.25 }, { description: 'Small surfaces: <10% deterioration - per component', weight: 0.25 }],
                        severe: [{ description: 'Large surfaces: >2sf of paint deteriorating - per room', weight: 2.75, lt: true }, { description: 'Small surfaces:>10% deterioration - per component', weight: 2.75, lt: true }]
                    }
                },
                {
                    name: 'Mold-Like Substance',
                    requirement: 'Surfaces should be free from significant amounts of mold-like substances.',
                    education: 'Mold growth is often a symptom of a water leak. Larger areas can cause respiratory problems. More than 1 sq foot is a severe deficiency, and the underlying moisture problem must be fixed.',
                    defects: {
                        moderate: [{ description: '>4 sq inches noted', weight: 0.25 }, { description: 'Elevated moisture levels noted', weight: 0.25 }],
                        severe: [{ description: ">1 sq foot of 'mold'", weight: 2.75, lt: true }, { description: ">9 sq feet of 'mold'", weight: 2.75, lt: true }]
                    }
                },
                {
                    name: 'Sharp Edges',
                    requirement: 'The unit must be free from sharp edges on building components that could cause serious injury.',
                    education: 'Exposed, sharp edges on counters, broken tiles, or damaged fixtures can cause deep lacerations. These hazards must be repaired, replaced, or shielded.',
                    defects: {
                        severe: [{ description: 'Sharp edge noted (likely require treatment from medical professional)', weight: 0.7 }]
                    }
                },
                {
                    name: 'Trip Hazard',
                    requirement: 'Walking surfaces must be even and free of significant vertical or horizontal gaps.',
                    education: 'Even small changes in elevation from buckled flooring or raised thresholds can cause a serious fall. All walking surfaces should be repaired to eliminate these hazards.',
                    defects: {
                        moderate: [{ description: '3/4 inch vertical deviation', weight: 0.25 }, { description: '2-inch horizontal separation', weight: 0.25 }]
                    }
                }
            ]
        },
        {
            category: 'Structures and Finishes',
            items: [
                {
                    name: 'Ceilings',
                    requirement: 'Ceilings must be structurally sound and free from large holes or instability.',
                    education: 'A sagging ceiling indicates a potential structural problem or a serious leak. Large holes compromise the fire barrier between floors. Such conditions warrant immediate repair.',
                    defects: {
                        moderate: [{ description: 'Unstable surface noted (deflection, sagging, etc.)', weight: 0.25 }, { description: 'Hole noted (>=2" diameter)', weight: 0.25 }],
                        severe: [{ description: 'Ceiling not functionally adequate (large section missing, etc.)', weight: 0.7 }]
                    }
                },
                {
                    name: 'Walls',
                    requirement: 'Walls must be intact and free of large holes.',
                    education: 'Holes in walls are unsightly and can allow pest entry. If they penetrate to an adjoining space, they compromise the fire and sound barrier between units.',
                    defects: {
                        moderate: [{ description: '>2" hole or cumulative holes in one wall >6"x6"', weight: 0.25 }, { description: 'Any size hole penetrating into adjoining space', weight: 0.25 }, { description: 'Detached covering', weight: 0.25 }]
                    }
                },
                {
                    name: 'Floor Covering & Finish',
                    requirement: 'Flooring must be present and the floor structure must be sound.',
                    education: 'Missing flooring that exposes the subfloor is a trip hazard. A floor structure that is sloped or soft indicates a serious underlying problem that could lead to collapse.',
                    defects: {
                        moderate: [{ description: '>=10% of flooring missing exposing substrate', weight: 0.25 }, { description: 'Floor structure sloped, rotted (not functionally adequate)', weight: 0.25 }]
                    }
                },
                {
                    name: 'Foundation (Basement)',
                    requirement: 'The foundation must be sound and the area must be free from water penetration.',
                    education: 'Water in a basement promotes mold and can lead to structural rot. Large cracks or crumbling concrete can indicate serious structural issues and warrant evaluation by an engineer.',
                    defects: {
                        moderate: [{ description: 'Evidence of water penetration', weight: 0.25 }, { description: 'Crack >=1/4" x 12"', weight: 0.25 }, { description: 'Exposed rebar noted', weight: 0.25 }, { description: 'Spalling/flaking noted - 12" x 12" x 3/4" deep', weight: 0.25 }, { description: 'Rot/damage noted to post, girder, etc.', weight: 0.25 }],
                        severe: [{ description: 'Possible structural concern noted', weight: 0.7 }]
                    }
                },
                {
                    name: 'Stairs and steps',
                    requirement: 'Stairs must have all treads present, level, and structurally sound.',
                    education: 'Damaged or missing components on a staircase can lead directly to severe falls and injuries. These must be repaired immediately to ensure user safety.',
                    defects: {
                        moderate: [{ description: 'Missing tread', weight: 0.25 }, { description: 'Loose or unlevel tread', weight: 0.25 }, { description: 'Nosing damage >1" deep or 4" wide', weight: 0.25 }, { description: 'Stringer damaged (rot, severe cracks, etc.)', weight: 0.25 }]
                    }
                },
                {
                    name: 'Structural Defects',
                    requirement: 'All structural members must be sound and not appear in danger of collapse.',
                    education: 'This is a catch-all for any obvious, severe structural problem, such as a failing roof truss or a severely bowing wall. Any such observation indicates a life-threatening situation and requires immediate assessment by a structural engineer.',
                    defects: {
                        severe: [{ description: 'Any structural member appearing in danger of collapse/failure', weight: 2.75, lt: true }]
                    }
                },
                {
                    name: 'Window',
                    requirement: 'Windows must be intact and fully operational (open, close, and lock).',
                    education: 'Windows provide light, ventilation, and sometimes egress. A window that cannot close securely is a severe deficiency. One that won\'t open or lock is a moderate issue. All components should be functional.',
                    defects: {
                        moderate: [{ description: 'Screen with 1" or larger damage or missing', weight: 0.25 }, { description: 'Pane/sash is missing or damaged (cracks, weatherstrip, etc. that impacts function)', weight: 0.25 }, { description: 'Lock inoperable', weight: 0.25 }, { description: 'Will not open or stay open', weight: 0.25 }],
                        severe: [{ description: 'Window will not close', weight: 0.7 }]
                    }
                }
            ]
        }
    ]
};

// --- UTILITY FUNCTIONS --- //
const getSampleSize = (units) => {
    if (units === 1) return 1; if (units <= 2) return 2; if (units <= 3) return 3;
    if (units <= 4) return 4; if (units <= 5) return 5; if (units <= 7) return 6;
    if (units <= 8) return 7; if (units <= 10) return 8; if (units <= 12) return 9;
    if (units <= 14) return 10; if (units <= 16) return 11; if (units <= 18) return 12;
    if (units <= 21) return 13; if (units <= 24) return 14; if (units <= 27) return 15;
    if (units <= 30) return 16; if (units <= 35) return 17; if (units <= 39) return 18;
    if (units <= 45) return 19; if (units <= 51) return 20; if (units <= 59) return 21;
    if (units <= 67) return 22; if (units <= 78) return 23; if (units <= 92) return 24;
    if (units <= 110) return 25; if (units <= 120) return 26; if (units <= 166) return 27;
    if (units <= 214) return 28; if (units <= 295) return 29; if (units <= 455) return 30;
    if (units <= 920) return 31; return 32;
};

const sampleSizeData = [
    { total: 1, sample: 1 }, { total: 2, sample: 2 }, { total: 3, sample: 3 },
    { total: 4, sample: 4 }, { total: 5, sample: 5 }, { total: "6-7", sample: 6 },
    { total: "8", sample: 7 }, { total: "9-10", sample: 8 }, { total: "11-12", sample: 9 },
    { total: "13-14", sample: 10 }, { total: "15-16", sample: 11 }, { total: "17-18", sample: 12 },
    { total: "19-21", sample: 13 }, { total: "22-24", sample: 14 }, { total: "25-27", sample: 15 },
    { total: "28-30", sample: 16 }, { total: "31-35", sample: 17 }, { total: "36-39", sample: 18 },
    { total: "40-45", sample: 19 }, { total: "46-51", sample: 20 }, { total: "52-59", sample: 21 },
    { total: "60-67", sample: 22 }, { total: "68-78", sample: 23 }, { total: "79-92", sample: 24 },
    { total: "93-110", sample: 25 }, { total: "111-120", sample: 26 }, { total: "121-166", sample: 27 },
    { total: "167-214", sample: 28 }, { total: "215-295", sample: 29 }, { total: "296-455", sample: 30 },
    { total: "456-920", sample: 31 }, { total: "921+", sample: 32 }
];


// --- COMPONENTS --- //

const Header = () => (
    <header className="app-header">
        <h1>📋 NSPIRE Inspection & Field Guide</h1>
    </header>
);

const InfoModal = ({ item, onClose }) => {
    if (!item) return null;
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="modal-close-btn" onClick={onClose}>&times;</button>
                <h3 className="modal-title">{item.name}</h3>
                <div className="modal-section">
                    <h4>Requirement</h4>
                    <p>{item.requirement}</p>
                </div>
                <div className="modal-section">
                    <h4>Education & Remediation</h4>
                    <p>{item.education}</p>
                </div>
            </div>
        </div>
    );
};


const SetupScreen = ({ onStart }) => {
    const [totalUnits, setTotalUnits] = useState('');

    const sampleSize = useMemo(() => {
        const num = parseInt(totalUnits, 10);
        return num > 0 ? getSampleSize(num) : 0;
    }, [totalUnits]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const num = parseInt(totalUnits, 10);
        if (num > 0) {
            onStart(num, sampleSize);
        }
    };

    return (
        <main className="container screen">
             <div className="card">
                <p className="intro-blurb">
                    Welcome to the NSPIRE Inspection Tool. This app helps you conduct inspections based on HUD's National Standards for the Physical Inspection of Real Estate (NSPIRE). Start by entering the total number of units to determine the required sample size. Use the info icons (ⓘ) next to each item during the inspection for detailed requirements and remediation guidance.
                </p>
            </div>
            <div className="card">
                <h2 className="card-title">New Inspection</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="totalUnits">Total Units in Property</label>
                        <input
                            type="number"
                            id="totalUnits"
                            className="form-input"
                            value={totalUnits}
                            onChange={(e) => setTotalUnits(e.target.value)}
                            placeholder="e.g., 150"
                            min="1"
                            required
                        />
                    </div>
                    {sampleSize > 0 && (
                        <div className="sample-size-info">
                            <p>Required sample size: <span>{sampleSize} units</span></p>
                        </div>
                    )}
                    <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: '20px' }}>
                        Start Inspection
                    </button>
                </form>
            </div>
             <div className="card">
                <h2 className="card-title">Sample Size Reference Table</h2>
                <div className="table-container">
                    <table className="sample-size-table">
                        <thead>
                            <tr>
                                <th>Total Units</th>
                                <th>Sample Size</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sampleSizeData.map(({ total, sample }) => (
                                <tr key={total}>
                                    <td>{total}</td>
                                    <td>{sample}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
    );
};

const DefectComponent = ({ defect, count, onAdd, onRemove }) => (
    <div className="defect">
        <p>{defect.description} <strong>({defect.weight} pts)</strong> {defect.lt && '🔴LT'}</p>
        <div className="defect-controls">
            <button aria-label={`Remove ${defect.description}`} className="defect-btn" onClick={onRemove}>-</button>
            <span aria-live="polite" className="defect-count">{count}</span>
            <button aria-label={`Add ${defect.description}`} className="defect-btn" onClick={onAdd}>+</button>
        </div>
    </div>
);

const InspectableItem = ({ item, loggedDefects, addDefect, removeDefect, onInfoClick, defectNotes, updateDefectNote }) => {
    const renderSeverityGroup = (severity) => {
        const defects = item.defects[severity];
        if (!defects || defects.length === 0) return null;

        return (
            <div className="severity-group" data-severity={severity}>
                <h4 className="severity-title">{severity}</h4>
                {defects.map((defect, index) => {
                     const key = `${item.name}-${severity}-${index}`;
                     const count = loggedDefects.filter(d => d.key === key).length;
                     const note = defectNotes[key] || '';
                     
                     return (
                         <div className="defect-wrapper" key={key}>
                            <DefectComponent
                                 defect={defect}
                                 count={count}
                                 onAdd={() => addDefect(item.name, severity, index, defect)}
                                 onRemove={() => removeDefect(key)}
                             />
                             {count > 0 && (
                                <textarea
                                    className="notes-textarea"
                                    value={note}
                                    onChange={(e) => updateDefectNote(key, e.target.value)}
                                    placeholder="Add optional notes..."
                                    aria-label={`Notes for ${defect.description}`}
                                    rows="2"
                                ></textarea>
                             )}
                         </div>
                     );
                })}
            </div>
        );
    };

    return (
        <div className="inspectable-item">
            <div className="item-header">
                <h3 className="item-name">{item.name}</h3>
                <button className="info-btn" onClick={() => onInfoClick(item)} aria-label={`More info about ${item.name}`}>ⓘ</button>
            </div>
            {renderSeverityGroup('low')}
            {renderSeverityGroup('moderate')}
            {renderSeverityGroup('severe')}
        </div>
    );
};


const InspectionScreen = ({ inspection, setInspection, onFinish }) => {
    const [activeTab, setActiveTab] = useState('outside');
    const [currentUnit, setCurrentUnit] = useState(1);
    const [infoModalItem, setInfoModalItem] = useState(null);

    const addDefect = useCallback((itemName, severity, defectIndex, defect) => {
        const key = `${itemName}-${severity}-${defectIndex}`;
        const newDefectLog = {
            id: Date.now() + Math.random(),
            area: activeTab,
            unitIndex: activeTab === 'unit' ? currentUnit : null,
            category: DEFECT_DATA[activeTab].find(c => c.items.some(i => i.name === itemName)).category,
            item: itemName,
            severity,
            description: defect.description,
            weight: defect.weight,
            lt: !!defect.lt,
            key
        };
        setInspection(prev => ({ ...prev, loggedDefects: [...prev.loggedDefects, newDefectLog]}));
    }, [activeTab, currentUnit, setInspection]);

    const removeDefect = useCallback((key) => {
        setInspection(prev => {
            const loggedDefects = [...prev.loggedDefects];
            let indexToRemove = -1;
            for (let i = loggedDefects.length - 1; i >= 0; i--) {
                if (loggedDefects[i].key === key) {
                    indexToRemove = i;
                    break;
                }
            }
            if (indexToRemove > -1) {
                loggedDefects.splice(indexToRemove, 1);
            }
            return { ...prev, loggedDefects };
        });
    }, [setInspection]);

    const updateDefectNote = useCallback((defectKey, note) => {
        setInspection(prev => ({
            ...prev,
            defectNotes: {
                ...prev.defectNotes,
                [defectKey]: note,
            }
        }));
    }, [setInspection]);

    const { reacScore, unitScore } = useMemo(() => {
        const totalWeight = inspection.loggedDefects.reduce((sum, d) => sum + d.weight, 0);
        const deduction = inspection.sampleSize > 0 ? totalWeight / inspection.sampleSize : 0;
        const reacScore = Math.max(0, 100 - deduction).toFixed(2);

        const unitWeight = inspection.loggedDefects
            .filter(d => d.area === 'unit')
            .reduce((sum, d) => sum + d.weight, 0);
        const unitScore = unitWeight.toFixed(2);

        return { reacScore, unitScore };
    }, [inspection.loggedDefects, inspection.sampleSize]);

    const currentData = DEFECT_DATA[activeTab];
    const loggedDefectsForCurrentScope = useMemo(() => {
        return inspection.loggedDefects.filter(d => 
            d.area === activeTab && (activeTab !== 'unit' || d.unitIndex === currentUnit)
        );
    }, [inspection.loggedDefects, activeTab, currentUnit]);

    return (
        <div className="inspection-screen">
            <main className="container">
                <div className="tabs">
                    <button role="tab" aria-selected={activeTab === 'outside'} className={`tab ${activeTab === 'outside' ? 'active' : ''}`} onClick={() => setActiveTab('outside')}>Outside</button>
                    <button role="tab" aria-selected={activeTab === 'inside'} className={`tab ${activeTab === 'inside' ? 'active' : ''}`} onClick={() => setActiveTab('inside')}>Inside</button>
                    <button role="tab" aria-selected={activeTab === 'unit'} className={`tab ${activeTab === 'unit' ? 'active' : ''}`} onClick={() => setActiveTab('unit')}>Units</button>
                </div>

                {activeTab === 'unit' && (
                    <div className="unit-selector card">
                        <label htmlFor="unit-select">Inspecting Unit:</label>
                        <select id="unit-select" value={currentUnit} onChange={e => setCurrentUnit(Number(e.target.value))}>
                            {[...Array(inspection.sampleSize).keys()].map(i => (
                                <option key={i+1} value={i+1}>{i+1}</option>
                            ))}
                        </select>
                    </div>
                )}

                {currentData.map(category => (
                    <details key={category.category} className="accordion-category" open>
                        <summary className="accordion-header">
                            <h2 className="accordion-title">{category.category}</h2>
                            <span className="accordion-toggle">+</span>
                        </summary>
                        <div className="accordion-content">
                            {category.items.map(item => (
                                <React.Fragment key={item.name}>
                                    <InspectableItem
                                        item={item}
                                        loggedDefects={loggedDefectsForCurrentScope}
                                        addDefect={addDefect}
                                        removeDefect={removeDefect}
                                        onInfoClick={setInfoModalItem}
                                        defectNotes={inspection.defectNotes}
                                        updateDefectNote={updateDefectNote}
                                    />
                                </React.Fragment>
                            ))}
                        </div>
                    </details>
                ))}
            </main>
            <footer className="score-footer">
                <div className="score-item">
                    <div className="score-value">{reacScore}</div>
                    <div className="score-label">REAC Score</div>
                </div>
                <div className={`score-item ${parseFloat(unitScore) >= 30 ? 'fail' : ''}`}>
                    <div className="score-value" style={parseFloat(unitScore) >= 30 ? {color: '#ffcdd2'} : {}}>{unitScore}</div>
                    <div className="score-label">Unit Perf. Score</div>
                </div>
                <div className="finish-button-container">
                    <button className="btn btn-secondary" onClick={onFinish}>Finish & Report</button>
                </div>
            </footer>
            <InfoModal item={infoModalItem} onClose={() => setInfoModalItem(null)} />
        </div>
    );
};

const ReportScreen = ({ inspection, onRestart }) => {
    const { reacScore, unitScore, unitScoreStatus } = useMemo(() => {
        const totalWeight = inspection.loggedDefects.reduce((sum, d) => sum + d.weight, 0);
        const deduction = inspection.sampleSize > 0 ? totalWeight / inspection.sampleSize : 0;
        const reacScore = Math.max(0, 100 - deduction);

        const unitWeight = inspection.loggedDefects
            .filter(d => d.area === 'unit')
            .reduce((sum, d) => sum + d.weight, 0);

        const unitScoreStatus = unitWeight >= 30 ? 'Fail' : 'Pass';
        
        return { reacScore, unitScore: unitWeight, unitScoreStatus };
    }, [inspection]);

    const sortedDefects = useMemo(() => {
        return [...inspection.loggedDefects].sort((a, b) => {
            if (a.area < b.area) return -1;
            if (a.area > b.area) return 1;
            if (a.unitIndex < b.unitIndex) return -1;
            if (a.unitIndex > b.unitIndex) return 1;
            if (a.category < b.category) return -1;
            if (a.category > b.category) return 1;
            return 0;
        });
    }, [inspection.loggedDefects]);

    return (
        <main className="container screen report-screen">
            <div className="card">
                <h2 className="card-title">Inspection Report</h2>
                <div className="report-summary">
                    <div className={`summary-card ${unitScoreStatus.toLowerCase()}`}>
                        <div className="summary-card-title">Overall Status</div>
                        <div className={`summary-card-value ${unitScoreStatus.toLowerCase()}`}>{unitScoreStatus}</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-card-title">REAC Score</div>
                        <div className="summary-card-value">{reacScore.toFixed(2)}</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-card-title">Unit Performance Score</div>
                        <div className="summary-card-value">{unitScore.toFixed(2)}</div>
                    </div>
                </div>

                <div className="defect-list">
                    <h3 className="defect-list-title">Logged Deficiencies ({inspection.loggedDefects.length})</h3>
                    {sortedDefects.length > 0 ? (
                        <ul>
                            {sortedDefects.map(d => {
                                const note = inspection.defectNotes[d.key];
                                return (
                                <li key={d.id}>
                                    <div className="defect-report-item">
                                        <div className="defect-report-main">
                                            <span className="defect-list-loc">
                                                {d.area === 'unit' ? `Unit ${d.unitIndex}` : d.area.charAt(0).toUpperCase() + d.area.slice(1)}
                                            </span>
                                            <span className="defect-list-desc">{d.description}{d.lt ? ' 🔴LT':''}</span>
                                            <span className={`defect-list-sev defect-list-sev-${d.severity}`}>{d.severity}</span>
                                        </div>
                                        {note && (
                                            <div className="defect-report-notes">
                                                <strong>Notes:</strong> {note}
                                            </div>
                                        )}
                                    </div>
                                </li>
                            )})}
                        </ul>
                    ) : <p>No deficiencies recorded.</p>}
                </div>
                
                <button onClick={onRestart} className="btn btn-primary btn-full" style={{marginTop: '30px'}}>
                    Start New Inspection
                </button>
            </div>
        </main>
    )
};


const App = () => {
    const [step, setStep] = useState('setup'); // 'setup', 'inspection', 'report'
    const [inspection, setInspection] = useState(null);

    const handleStart = (totalUnits, sampleSize) => {
        setInspection({
            totalUnits,
            sampleSize,
            loggedDefects: [],
            defectNotes: {},
        });
        setStep('inspection');
    };

    const handleFinish = () => {
        setStep('report');
    }

    const handleRestart = () => {
        setInspection(null);
        setStep('setup');
    }

    const renderStep = () => {
        switch (step) {
            case 'inspection':
                return <InspectionScreen inspection={inspection} setInspection={setInspection} onFinish={handleFinish} />;
            case 'report':
                return <ReportScreen inspection={inspection} onRestart={handleRestart}/>
            case 'setup':
            default:
                return <SetupScreen onStart={handleStart} />;
        }
    };

    return (
        <>
            <Header />
            {renderStep()}
        </>
    );
};

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);