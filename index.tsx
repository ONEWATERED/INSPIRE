/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- GEMINI API SETUP --- //
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to convert a Blob to a Base64 string
const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64data = reader.result as string;
            // The result includes the data URL prefix, e.g., "data:audio/webm;base64,"
            // We need to strip this prefix before sending to the API.
            resolve(base64data.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};


// --- DATA STRUCTURES --- //
// This is the complete list of all items from the guide with educational content.
const DEFECT_DATA = {
    outside: [
        {
            category: 'Site / Appeal',
            items: [
                {
                    name: 'Litter',
                    requirement: 'Keep the property clean and free of trash.',
                    education: 'Why it matters: Trash attracts bugs and rodents, looks bad, and can be a health hazard. What to look for: Look for more than 10 small pieces of trash (like wrappers or cups) in a 10x10 foot area. Also look for any large discarded items like furniture or appliances.',
                    defects: {
                        low: [{ description: '10 small items (food wrapper, paper, etc.) noted within 100sf area', weight: 0.1 }, { description: 'Any large item discarded incorrectly (furniture, etc.)', weight: 0.1 }],
                    }
                },
                {
                    name: 'Site Drainage',
                    requirement: 'Drains must be clear so water can flow away from buildings.',
                    education: 'Why it matters: Clogged drains cause flooding, foundation damage, and create slipping hazards in winter. A missing drain cover is a serious trip hazard someone could fall into. What to look for: Check if drains are blocked with leaves, dirt, or trash. Make sure all drain covers are present and securely in place.',
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
                    requirement: 'Stairs with 4 or more risers (steps) must have a secure handrail.',
                    education: 'Why it matters: Handrails prevent serious falls on stairs. A loose handrail is dangerous because it can break away when someone needs it most. What to look for: If you see 4 or more steps, there MUST be a handrail. Grab the handrail and shake it firmly. If it\'s loose or wobbly, it\'s a defect. Note if a handrail is missing but you see signs it used to be there (like screw holes). A non-scored defect is for stairs missing a handrail where there\'s no evidence of one ever being installed.',
                    defects: {
                        low: [{ description: 'Handrail is missing where needed without evidence of previous installation', weight: 0.0 }],
                        moderate: [{ description: 'Handrail loose', weight: 0.2 }, { description: 'Missing with evidence of previous install', weight: 0.0 }, { description: 'Incorrect installation', weight: 0.2 }]
                    }
                },
                {
                    name: 'Parking Lot',
                    requirement: 'Parking lots must be safe to walk and drive on, free of major potholes or flooding.',
                    education: 'Why it matters: Large potholes can damage cars and cause people to trip and fall. Large puddles can hide potholes and create ice slicks in cold weather. What to look for: Look for any pothole that is at least 4 inches deep and about the size of a sheet of paper. Look for large areas of standing water covering more than 5% of the parking area.',
                    defects: {
                        moderate: [{ description: 'At least 1 pothole 4" deep and 1sf diameter', weight: 0.2 }, { description: '>3" of ponding covering >=5% of parking', weight: 0.2 }]
                    }
                },
                {
                    name: 'Roads/Drives',
                    requirement: 'Roads must be clear and safe for emergency vehicles to pass.',
                    education: 'Why it matters: This is a LIFE-THREATENING issue. If a fire truck or ambulance can\'t get through, people could die. What to look for: Check if the main road to the property is blocked or impassable. Also look for severe potholes (at least 4 inches deep and about the size of a sheet of paper).',
                    defects: {
                        moderate: [{ description: 'At least 1 pothole 4" deep and 1sf diameter', weight: 0.2 }],
                        severe: [{ description: 'Access to property is blocked/impassable', weight: 0.55 }]
                    }
                },
                {
                    name: 'Walks & Ramps',
                    requirement: 'Walkways and ramps must be clear and usable.',
                    education: 'Why it matters: People need a clear and safe path to walk, especially those using wheelchairs or walkers. Blockages and severe damage are hazards. What to look for: Is the path blocked by trash, equipment, or overgrown plants? Is the surface so damaged (e.g., crumbling, large cracks) that it is difficult to walk on?',
                    defects: {
                        moderate: [{ description: 'Blockage creating a lack of clear travel', weight: 0.2 }, { description: 'Not functional (severely damaged)', weight: 0.2 }]
                    }
                },
                {
                    name: 'Stairs and Steps',
                    requirement: 'All parts of a staircase must be present and in good condition.',
                    education: 'Why it matters: A broken or missing step can cause a severe fall. The entire staircase could collapse if the main supports (stringers) are rotten or cracked. What to look for: Check for missing, loose, or unlevel steps. Look for damage on the edge of the step (nosing). Inspect the support beams on the sides of the stairs (stringers) for rot, rust, or large cracks.',
                    defects: {
                        moderate: [{ description: 'Missing tread', weight: 0.2 }, { description: 'Loose/unlevel tread', weight: 0.2 }, { description: 'Nosing damage >1" deep or 4" wide', weight: 0.2 }, { description: 'Stringer damaged (rot, severe rust, cracks, etc.)', weight: 0.2 }]
                    }
                },
                {
                    name: 'Trip Hazard',
                    requirement: 'Walking paths must be level and even.',
                    education: 'Why it matters: A small bump or crack in the sidewalk is one of the most common ways people get seriously hurt. What to look for: Look for any spot where the sidewalk is raised by more than 3/4 of an inch (about the height of a quarter on its edge). Also look for gaps between sidewalk sections that are wider than 2 inches.',
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
                    requirement: 'Garage doors must be in good condition and work properly.',
                    education: 'Why it matters: A broken garage door is a security risk. A hole lets in pests, and a door that doesn\'t work can trap a car or prevent access. What to look for: Are there any holes in the door? Does the door open and close correctly, and stay open? This includes automatic openers.',
                    defects: {
                        moderate: [{ description: 'Any size penetrating hole noted', weight: 0.2 }, { description: "Door won't open, stay open or close correctly (includes auto openers)", weight: 0.2 }]
                    }
                },
                {
                    name: 'General Door (Non-Entry/Fire)',
                    requirement: 'Doors for sheds, utility closets, etc., must work.',
                    education: 'Why it matters: These doors need to secure areas and protect what\'s inside from weather. What to look for: Check if the door opens, closes, and latches properly. Note any damage that prevents it from working.',
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
                    requirement: 'Electrical panels must be safe and easy to access in an emergency.',
                    education: 'Why it matters: This is LIFE-THREATENING. Water in a panel can cause electrocution or fire. A blocked panel wastes time in an emergency. A damaged breaker won\'t trip when it\'s supposed to, which can start a fire. Using the wrong material for a fix (like a penny for a fuse) is extremely dangerous. What to look for: Can you easily get to the breaker panel? Is there any sign of water or rust? Are any breakers cracked or broken? Is there anything in the panel that shouldn\'t be there?',
                    defects: {
                        moderate: [{ description: 'Service/breaker panel is blocked or difficult to access', weight: 0.2 }],
                        severe: [{ description: 'Water intrusion, rust or foreign substance over components', weight: 0.55 }, { description: 'Damaged breakers', weight: 2.25, lt: true }, { description: 'Foreign material (non-UL listed material) used for repair', weight: 0.55 }]
                    }
                },
                {
                    name: 'Outlets / Switches & GFCI',
                    requirement: 'Outdoor and wet-area outlets must have working GFCI protection. All outlets must be wired correctly.',
                    education: 'Why it matters: A GFCI (the outlet with "TEST" and "RESET" buttons) saves lives by preventing electric shock, especially around water. It\'s required for bathrooms, kitchens, garages, and outdoor outlets. Incorrect wiring is a fire and shock hazard. What to look for: Use an outlet tester. Does the GFCI test button trip the outlet? Is it missing where it should be? Does the tester show correct wiring (e.g., no "open ground" or "reversed polarity")? Is the outlet dead?',
                    defects: {
                        severe: [{ description: 'GFCI/AFCI inoperable', weight: 0.55 }, { description: 'GFCI missing where required', weight: 0.55 }, { description: 'Ungrounded or incorrect wiring noted', weight: 0.55 }, { description: 'Outlet not energized', weight: 0.55 }]
                    }
                },
                {
                    name: 'Wires or Conductors',
                    requirement: 'NO exposed electrical wires or components are allowed. EVER.',
                    education: 'Why it matters: This is a LIFE-THREATENING, zero-tolerance hazard. Touching an exposed wire can kill someone instantly or start a fire. What to look for: Look for ANY exposed wires, missing outlet/switch covers, open holes ("knockouts") in junction boxes or breaker panels, or damaged wire insulation where you can see the metal. If you see wire nuts, the cover is missing. This is an immediate, severe hazard.',
                    defects: {
                        severe: [{ description: 'Outlet/switch damaged - no longer safe', weight: 2.25, lt: true }, { description: 'Damaged or missing cover (includes wall mounted lights)', weight: 2.25 }, { description: 'Missing knockout', weight: 2.25 }, { description: 'Open breaker port', weight: 2.25 }, { description: '>1/2" gap noted', weight: 2.25 }, { description: 'Exposed wire nuts', weight: 2.25, lt: true }, { description: 'Unshielded wires noted (damaged covering)', weight: 2.25, lt: true }]
                    }
                },
                {
                    name: 'Lighting',
                    requirement: 'Outdoor lights must be securely mounted and working.',
                    education: 'Why it matters: Outdoor lighting is crucial for safety, helping to prevent trips and deter crime. A loose fixture or pole could fall and injure someone. What to look for: Is the light fixture or its pole loose or unstable? Is it so damaged that it no longer works?',
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
                    requirement: 'The chimney must be structurally safe.',
                    education: 'Why it matters: This is LIFE-THREATENING. A damaged chimney can leak carbon monoxide into the building or let hot embers escape and start a fire. What to look for: Look for major cracks, missing bricks, or any damage to the structure of the chimney, flue, or firebox. If it looks unsafe, it is.',
                    defects: {
                        severe: [{ description: 'Chimney/flue or firebox damaged/unsafe', weight: 2.25, lt: true }]
                    }
                },
                {
                    name: 'Egress',
                    requirement: 'The exit path from the property must be clear and safe.',
                    education: 'Why it matters: This is LIFE-THREATENING. In a fire, a blocked exit can trap people. Seconds count. What to look for: Is an exit gate locked or blocked with trash? Is a fire escape leaning or looking like it could collapse? Any blockage or structural problem with an exit path is a severe hazard.',
                    defects: {
                        severe: [{ description: 'Structural failure noted (leaning, etc.)', weight: 2.25, lt: true }, { description: 'Exit point is obstructed (locked gate, debris, etc.)', weight: 2.25, lt: true }]
                    }
                },
                {
                    name: 'Exit Signs',
                    requirement: 'Exit signs must be lit up and easy to see.',
                    education: 'Why it matters: This is LIFE-THREATENING. In a dark, smoky hallway, a lit exit sign is the only thing that shows people the way to safety. What to look for: Is the sign blocked by a plant or decoration? Is it lit up? Press the test button to check the battery backup. If it doesn\'t work for any reason, it\'s a critical failure.',
                    defects: {
                        severe: [{ description: 'Obscured from view (décor, plants, etc.)', weight: 2.25, lt: true }, { description: 'Not securely attached', weight: 2.25, lt: true }, { description: 'Missing where evidence of previous install', weight: 2.25, lt: true }, { description: 'No illumination (either internal or adjacent)', weight: 2.25, lt: true }, { description: 'Test button inop', weight: 2.25, lt: true }]
                    }
                },
                {
                    name: 'Fire Escapes',
                    requirement: 'Fire escapes must be strong and complete.',
                    education: 'Why it matters: This is LIFE-THREATENING. A fire escape must be a reliable path to safety. If it is rusted, damaged, or has missing parts, it could collapse when people are using it. What to look for: Check for any damage or missing pieces on the stairs, ladders, platforms, or railings.',
                    defects: {
                        severe: [{ description: 'Stairs, ladder, platform or handrails are damaged/missing', weight: 2.25, lt: true }]
                    }
                },
                {
                    name: 'Fire Extinguisher',
                    requirement: 'Fire extinguishers must be charged, inspected, and ready to use.',
                    education: 'Why it matters: This is LIFE-THREATENING. A working fire extinguisher can stop a small fire from becoming a disaster. A dead or missing one is useless. What to look for: Is the needle in the green? If it\'s rechargeable, is the inspection tag current (within the last year)? If it\'s disposable, is it less than 12 years old? Is there any damage?',
                    defects: {
                        severe: [{ description: 'Under/over charged', weight: 2.25, lt: true }, { description: 'Missing with evidence of prior installation', weight: 2.25, lt: true }, { description: 'Rechargeable: Missing or expired tag', weight: 2.25, lt: true }, { description: 'Damage (impacting function)', weight: 2.25, lt: true }, { description: 'Disposable: Extinguisher >12 years old', weight: 2.25, lt: true }]
                    }
                },
                {
                    name: 'Flammable & Combustible Items',
                    requirement: 'Keep flammable items away from things that can start a fire.',
                    education: 'Why it matters: This is LIFE-THREATENING. Things like gas cans, propane tanks, or even piles of oily rags can explode or burst into flames if they are too close to a heat source like a water heater or furnace. What to look for: Check for any flammable or combustible items within 3 feet of an ignition source.',
                    defects: {
                        severe: [{ description: 'Flammable/combustible item within 3 feet of ignition source (furnace, heater, etc.)', weight: 2.25, lt: true }]
                    }
                },
                {
                    name: 'Sprinkler Assembly',
                    requirement: 'Fire sprinkler heads must be clear and undamaged.',
                    education: 'Why it matters: This is LIFE-THREATENING. A fire sprinkler can save lives, but only if it works. Stacking boxes or anything else within 18 inches of the sprinkler head blocks the water spray. Paint or corrosion can seal the head shut, preventing it from activating. What to look for: Is anything stored or placed within 18" of the sprinkler head? Is the head painted over, corroded, or damaged?',
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
                    requirement: 'Guardrails are required for any drop of 30 inches or more.',
                    education: 'Why it matters: This is LIFE-THREATENING. A fall from 30 inches (2.5 feet) or more can cause serious injury or death. Guardrails prevent these falls. What to look for: Check any porch, balcony, retaining wall, or elevated walkway. If there\'s a drop of 30" or more, a guardrail MUST be present. It must be at least 42" high and all its parts must be secure.',
                    defects: {
                        severe: [{ description: 'Guardrail is missing where required', weight: 2.25, lt: true }, { description: 'Incorrect height', weight: 2.25 }, { description: 'Missing or loose components impacting function', weight: 2.25 }]
                    }
                },
                {
                    name: 'Infestation',
                    requirement: 'The property must be free of rats.',
                    education: 'Why it matters: Rats carry disease and can cause major property damage by chewing through walls and wires. What to look for: Look for rat droppings, burrows (holes in the ground near foundations), or signs of chewing.',
                    defects: {
                        moderate: [{ description: 'Evidence of rats (droppings, burrows, chewed holes, etc.)', weight: 0.2 }]
                    }
                },
                {
                    name: 'Sharp Edges',
                    requirement: 'The property must be free of dangerous sharp hazards.',
                    education: 'Why it matters: A sharp piece of metal siding or broken equipment can cause a very serious cut that requires stitches or a trip to the hospital. What to look for: Look for any sharp edge on the building or equipment that is exposed and could easily injure someone.',
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
                    requirement: 'In buildings from before 1978, all paint must be in good condition.',
                    education: 'Why it matters: This is LIFE-THREATENING. Peeling or chipping lead paint creates toxic dust that can cause permanent brain damage in children. This is a major health hazard. What to look for: In any building built before 1978, look for any paint that is chipping, cracking, or turning to dust. The amount matters: over 20 square feet is a severe, life-threatening hazard.',
                    defects: {
                        moderate: [{ description: '<20 sf of deterioration (chipping, cracking, chalking, etc.)', weight: 0.2 }],
                        severe: [{ description: '>20 sf of deterioration (chipping, cracking, chalking, etc.)', weight: 2.25, lt: true }]
                    }
                },
                {
                    name: 'Guttering',
                    requirement: 'Gutters and downspouts must be attached and clear.',
                    education: 'Why it matters: Gutters protect the building\'s foundation by directing water away. Clogged or broken gutters can cause water to pour down the side of the building, leading to leaks and foundation damage. What to look for: Are the gutters full of leaves and debris? Are any parts loose, disconnected, or falling off?',
                    defects: {
                        moderate: [{ description: 'Debris limiting the drain or gutter', weight: 0.2 }, { description: 'Gutter component missing or not securely attached', weight: 0.2 }, { description: 'Gutter component damaged and impacting function', weight: 0.2 }]
                    }
                },
                {
                    name: 'Roofing Material',
                    requirement: 'The roof must be in good condition and not leak.',
                    education: 'Why it matters: The roof is the building\'s main protection from rain and snow. Damaged roofing material lets water in, which leads to rot, mold, and major structural damage. What to look for: Look for missing shingles or other roofing materials. Can you see the wood underneath (the substrate)? Look for large puddles of standing water on flat roofs.',
                    defects: {
                        moderate: [{ description: '25 sf of ponding noted', weight: 0.2 }, { description: 'Damage/missing roofing exposing substrate', weight: 0.2 }]
                    }
                },
                {
                    name: 'Soffit/Fascia',
                    requirement: 'The eaves of the roof must be sealed.',
                    education: 'Why it matters: Soffits and fascia are the parts under the roof\'s overhang. Holes here are an open invitation for squirrels, birds, and other pests to move into the attic, where they can chew wires and destroy insulation. What to look for: Look for any holes in the soffit or fascia boards.',
                    defects: {
                        moderate: [{ description: 'Penetrating holes noted in soffit, fascia or roof deck', weight: 0.2 }]
                    }
                }
            ]
        },
        {
            category: 'Exterior Walls',
            items: [
                {
                    name: 'Wall Coverings',
                    requirement: 'Exterior wall coverings must be weathertight and free from damage that compromises the structure or allows for water and pest intrusion.',
                    education: "Why it matters: The exterior wall covering is the building's main shield against the elements. A hole, crack, or section of rot allows water to seep into the wall cavity, leading to dangerous mold growth, structural decay, and pest infestations. On buildings built after 1978, failing paint is not a lead hazard but indicates the wood or siding underneath is no longer protected from moisture. What to look for: Check for holes of any size that go all the way through. Look for missing sections of siding, brick, or stucco. On wood siding, look for soft, spongy areas that indicate rot. For all surfaces, look for large cracks or signs the wall is bulging or bowing. For buildings built after 1978, identify areas of peeling or chalking paint larger than about 10 square feet on any single wall.",
                    defects: {
                        moderate: [
                            { description: '>=1 sq ft of siding/stucco/brick is missing (substrate not exposed)', weight: 0.2 },
                            { description: '>=10 sq ft of peeling/failing paint on single wall (post-1978 building)', weight: 0.2 },
                            { description: 'Significant cracking or rot noted in siding material', weight: 0.2 },
                        ],
                        severe: [
                            { description: 'Any size hole penetrating to interior space', weight: 0.55 },
                            { description: 'Wall covering is failing, exposing substrate (e.g., sheathing)', weight: 0.55 },
                            { description: 'Wall appears to be buckling, bowing, or showing signs of structural failure', weight: 2.25, lt: true }
                        ]
                    }
                },
                {
                    name: 'Address & Signage',
                    requirement: 'The building address and unit numbers must be easy to read.',
                    education: 'Why it matters: This is a critical safety issue. In an emergency, firefighters, police, or paramedics need to find the right address and unit instantly. Wasting time looking for a number could be a matter of life and death. What to look for: Can you easily read the address and building numbers from the street? Are they broken, blocked by bushes, or faded?',
                    defects: {
                        moderate: [{ description: 'Damage causing instability', weight: 0.2 }, { description: 'Address signage near entrance is broken, blocked or illegible', weight: 0.2 }, { description: 'Building ID signs are blocked, broken or illegible', weight: 0.2 }],
                        severe: [{ description: 'Address and/or building number are completely missing or illegible from the street, posing a significant safety risk for emergency services.', weight: 0.55 }]
                    }
                },
                {
                    name: 'Dryer Vent',
                    requirement: 'Dryer vents must be covered and clear of lint.',
                    education: 'Why it matters: This is LIFE-THREATENING. A vent clogged with lint is a major fire hazard. The super-heated air from the dryer can easily ignite the lint buildup. A missing cover lets pests and cold air in. What to look for: Is the outside vent cover missing or broken? Is the vent visibly clogged with lint?',
                    defects: {
                        low: [{ description: 'Missing or damaged cover noted', weight: 0.1 }],
                        severe: [{ description: 'Vent is blocked/clogged (lint, nest, etc.)', weight: 2.25, lt: true }]
                    }
                },
                {
                    name: 'Erosion Under Structures',
                    requirement: 'The ground must not be washing away from under the building.',
                    education: 'Why it matters: Erosion can wash away the soil that supports the building\'s foundation or a porch. This can make the structure unstable and lead to collapse. What to look for: Look for areas where soil has been washed away, exposing the base (footing) of a foundation or support post.',
                    defects: {
                        low: [{ description: 'Erosion causing footer or support exposure or erosion >2 ft away and depth of erosion > than distance to structure', weight: 0.1 }]
                    }
                },
                {
                    name: 'Fences | Security',
                    requirement: 'Fences and gates must be in good working order.',
                    education: 'Why it matters: Fences provide security and safety. A broken fence has holes, a broken gate won\'t lock, and a failing post means the fence could fall over. What to look for: Are there large holes? Does the gate latch work? Are posts leaning or unstable?',
                    defects: {
                        moderate: [{ description: 'Hole(s) effecting 20% of single section', weight: 0.2 }, { description: 'Gate latch/lock inoperable', weight: 0.2 }, { description: 'Failing post(s) allowing for lean or instability', weight: 0.2 }]
                    }
                },
                {
                    name: 'Foundation',
                    requirement: 'The foundation must be solid and support the building.',
                    education: 'Why it matters: The foundation holds up the entire house. A major crack or crumbling concrete can be a sign of a serious structural problem. What to look for: Look for large cracks (wider than 1/4"), exposed metal rebar, or areas where the concrete is crumbling. Any sign that the foundation might be failing is a serious defect.',
                    defects: {
                        moderate: [{ description: 'Damaged/missing vent', weight: 0.2 }, { description: 'Crack >=1/4" x 12"', weight: 0.2 }, { description: 'Exposed rebar noted', weight: 0.2 }, { description: 'Spalling/flaking noted - 12" x 12" x 3/4" deep', weight: 0.2 }, { description: 'Rot/damage noted to post, girder, etc.', weight: 0.2 }],
                        severe: [{ description: 'Possible structural concern noted', weight: 0.55 }]
                    }
                },
                {
                    name: 'Retaining Walls',
                    requirement: 'Retaining walls must be stable and upright.',
                    education: 'Why it matters: These walls hold back a huge amount of soil. If a wall is leaning or starting to collapse, it could fail completely, causing a landslide. What to look for: Is the wall leaning away from the dirt it is holding back? Has part of it already collapsed?',
                    defects: {
                        moderate: [{ description: 'Leaning from fill side or portion collapsed', weight: 0.2 }]
                    }
                },
                {
                    name: 'Structural Defects',
                    requirement: 'The building must be structurally sound.',
                    education: 'Why it matters: This is LIFE-THREATENING. This is a catch-all for any major structural problem that looks like it could cause a collapse. What to look for: Look for a sagging roof, a porch that is pulling away from the building, or a wall that is bowing outwards. If you see something that makes you think "that doesn\'t look safe," it is a severe defect.',
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
                    requirement: 'There must be no gas, oil, or sewage leaks.',
                    education: 'Why it matters: This is LIFE-THREATENING. A gas or oil leak can cause an explosion or fire. Raw sewage is a major health hazard. What to look for: Can you smell gas or see an oil leak? Is there sewage backed up on the ground? Is the cover for the sewer cleanout pipe missing? Even a leaking outdoor faucet (hose bib) is a defect.',
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
                    requirement: 'Bathrooms need a working fan or a window that opens.',
                    education: 'Why it matters: Steam from showers creates moisture that grows mold. Mold can make people sick. Ventilation gets rid of the moisture. What to look for: If there\'s no window in the bathroom, there must be a fan. Turn the fan on. Does it work? Is the cover missing or clogged with dust?',
                    defects: {
                        moderate: [{ description: 'Inop or missing and no window present', weight: 0.23 }, { description: 'Missing or damaged vent cover', weight: 0.23 }, { description: 'Obstruction noted', weight: 0.23 }]
                    }
                },
                {
                    name: 'Cabinets',
                    requirement: 'Cabinets must be functional and safe.',
                    education: 'Why it matters: Broken cabinets are unusable. A cabinet that is falling off the wall is a major safety hazard. What to look for: Are half or more of the cabinet doors or drawers broken or missing? Check if they feel securely attached to the wall.',
                    defects: {
                        moderate: [{ description: '50% of cabinets or components missing/ damaged/inop', weight: 0.23 }]
                    }
                },
                {
                    name: 'Countertops',
                    requirement: 'The kitchen must have a cleanable surface for preparing food.',
                    education: 'Why it matters: You can\'t safely prepare food on a damaged countertop where the raw wood (substrate) is exposed. It traps bacteria and can\'t be properly cleaned. What to look for: Is there a countertop? Look for large damaged areas (more than 10% of the surface) where the top layer is gone and the particle board or wood underneath is showing.',
                    defects: {
                        moderate: [{ description: 'No food prep area', weight: 0.23 }, { description: '>=10% of top has exposed substrate', weight: 0.23 }]
                    }
                },
                {
                    name: 'Grab Bars',
                    requirement: 'Installed grab bars must be 100% secure.',
                    education: 'Why it matters: Grab bars are safety devices. People grab them to prevent a fall. A loose grab bar is extremely dangerous because it can pull out of the wall when someone puts their weight on it, causing a serious injury. What to look for: Grab the bar and pull on it. Is it even slightly loose?',
                    defects: {
                        moderate: [{ description: 'Slightly loose', weight: 0.23 }]
                    }
                },
                {
                    name: 'Refrigerator',
                    requirement: 'The unit must have a working refrigerator.',
                    education: 'Why it matters: A refrigerator is essential for storing food safely. If food isn\'t kept cold, it can spoil and make people sick. What to look for: Is the refrigerator keeping food cold? Does the door seal properly? A broken seal means it won\'t cool efficiently.',
                    defects: {
                        moderate: [{ description: 'Not cooling adequately', weight: 0.23 }, { description: 'Seal sagging, torn or detached impacting function', weight: 0.23 }, { description: 'Component damaged or missing (handle, drawers, etc.) impacting function', weight: 0.23 }]
                    }
                },
                {
                    name: 'Kitchen Ventilation',
                    requirement: 'The kitchen needs a working vent hood or fan.',
                    education: 'Why it matters: A kitchen vent removes smoke and grease. If the filter is missing, grease can build up in the ductwork and become a fire hazard. What to look for: Is the filter missing or clogged with grease? Turn on the fan. Does it work?',
                    defects: {
                        moderate: [{ description: 'Filter missing or damaged', weight: 0.23 }, { description: 'Vent is inoperable or part or/fully blocked', weight: 0.23 }, { description: 'Exhaust duct not securely attached or missing', weight: 0.23 }]
                    }
                },
                {
                    name: 'Range / Oven',
                    requirement: 'The stove and oven must work.',
                    education: 'Why it matters: Residents need to be able to cook their food. What to look for: Turn on each burner. Do they all heat up? Does the oven work? Are any essential parts like knobs or grates missing?',
                    defects: {
                        low: [{ description: '1 burner or more (or oven) not producing heat', weight: 0.1 }],
                        moderate: [{ description: 'Component missing (knob, grate, oven seal, etc.)', weight: 0.23 }]
                    }
                },
                {
                    name: 'Shower/Tub & Hardware',
                    requirement: 'The unit must have a working shower or bathtub.',
                    education: 'Why it matters: A working shower/tub is a basic need for hygiene. An inoperable shower or a fully clogged drain makes the unit unsanitary. What to look for: Does the water run? Do the handles work? Does it drain? Are there leaks? Can the person use it in private (is there a curtain or door)?',
                    defects: {
                        low: [{ description: 'Component (stopper, curtain, etc.) damaged or missing and does NOT impact function', weight: 0.1 }, { description: '<50% discoloration', weight: 0.1 }],
                        moderate: [{ description: 'Component (diverter, head, handle, leak, door, etc.) damaged and impacts function', weight: 0.23 }, { description: '>=50% discoloration', weight: 0.23 }, { description: "Shower or tub can't be used in private", weight: 0.23 }],
                        severe: [{ description: 'Tub/shower is inoperable', weight: 0.65 }, { description: 'Drain fully clogged', weight: 0.65 }]
                    }
                },
                {
                    name: 'Sink',
                    requirement: 'Sinks must be in good working order.',
                    education: 'Why it matters: Sinks are essential for washing hands and dishes. A sink that is cracked, won\'t drain, or has broken handles is not usable. What to look for: Does the sink hold water? Do the handles work? Is the drain clogged? Is the sink pulling away from the wall?',
                    defects: {
                        low: [{ description: 'Missing or inoperable stopper/strainer', weight: 0.1 }, { description: 'Leak outside of basin (around handles, etc.)', weight: 0.1 }],
                        moderate: [{ description: 'Missing or inoperable handles', weight: 0.23 }, { description: "Won't hold water (sink damaged)", weight: 0.23 }, { description: 'Drain clogged', weight: 0.23 }, { description: 'Pulled away from wall', weight: 0.23 }]
                    }
                },
                {
                    name: 'Toilet',
                    requirement: 'The unit must have a private, working, and stable toilet.',
                    education: 'Why it matters: This is a fundamental health and sanitation requirement. A missing toilet is a LIFE-THREATENING health hazard. A toilet that doesn\'t flush or is loose on the floor is unusable and can cause major leaks and unsanitary conditions. What to look for: Is there a toilet? Does it flush and refill correctly? Try to rock the toilet; is it secure to the floor? Can it be used in private?',
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
                    requirement: 'The door from the unit to the garage must be safe and functional.',
                    education: 'Why it matters: A malfunctioning door can be a security risk. A hole lets in pests and fumes from the garage. An inoperable door can trap someone. What to look for: Are there any holes? Does the door open and close correctly?',
                    defects: {
                        moderate: [{ description: 'Penetrating hole', weight: 0.23 }, { description: "Door won't open, stay open, close, etc.", weight: 0.23 }]
                    }
                },
                {
                    name: 'General Door (Passage)',
                    requirement: 'Interior doors (like for bedrooms) must be present and working.',
                    education: 'Why it matters: Interior doors provide privacy. A missing door, or one that is broken and can\'t close, fails this purpose. A door that is stuck shut can trap someone in a room. What to look for: Is the door missing? Does it close and latch? Does it open easily?',
                    defects: {
                        low: [{ description: 'Inoperable/missing or damage compromises privacy', weight: 0.1 }],
                        moderate: [{ description: "Passage door won't open", weight: 0.23 }]
                    }
                },
                {
                    name: 'Fire Rated Door',
                    requirement: 'Fire doors must close and latch by themselves.',
                    education: 'Why it matters: This is LIFE-THREATENING. A fire door (like from a unit to a public hallway or garage) is designed to stop a fire from spreading, giving people time to escape. For it to work, it MUST have a self-closer that pulls it completely shut and securely latches it. A hole, a propped-open door, or a broken self-closer makes it useless. What to look for: Open the door and let it go. Does it close and latch on its own? Are there any holes in the door? Is it propped open?',
                    defects: {
                        severe: [{ description: "Hardware inop/missing or door won't latch or open", weight: 0.65 }, { description: 'Self-closure inop', weight: 0.65 }, { description: 'Any size hole noted', weight: 0.65 }, { description: 'Assembly damaged (glass, frame, etc.)', weight: 0.65 }, { description: 'Door propped open', weight: 0.65 }, { description: 'Seal miss/damaged', weight: 0.65 }, { description: 'Missing fire door', weight: 2.50, lt: true }]
                    }
                },
                {
                    name: 'Entry Door',
                    requirement: 'The main entry door must be secure and weatherproof.',
                    education: 'Why it matters: The front door must lock to be secure. If it doesn\'t close properly or has gaps, it lets in drafts and pests and is a security risk. A door that won\'t open can trap someone inside during an emergency. What to look for: Does the door lock securely? Close the door. Can you see daylight around the edges (a gap wider than 1/8")? Does the door open freely?',
                    defects: {
                        moderate: [{ description: 'Seals damaged/missing', weight: 0.23 }, { description: 'Door, frame or threshold damaged/missing', weight: 0.23 }],
                        severe: [{ description: 'Light visible >1/8"', weight: 0.65 }, { description: 'Lock inoperable or missing', weight: 0.65 }, { description: "Door won't open", weight: 0.65 }]
                    }
                }
            ]
        },
        {
            category: 'Electrical',
            items: [
                {
                    name: 'Enclosures',
                    requirement: 'The unit\'s electrical panel must be safe and accessible.',
                    education: 'Why it matters: This is LIFE-THREATENING. A resident needs to be able to shut off the power in an emergency. Water or rust in the panel can cause a fire or fatal shock. A broken breaker will not prevent a fire. What to look for: Is the panel blocked by furniture? Open the panel. Do you see any water, rust, or damage?',
                    defects: {
                        moderate: [{ description: 'Blocked/difficult to access', weight: 0.23 }],
                        severe: [{ description: 'Water/rust over components', weight: 0.65 }, { description: 'Damaged breaker', weight: 2.50, lt: true }, { description: 'Foreign material used for repair', weight: 0.65 }]
                    }
                },
                {
                    name: 'Outlets / Switches / GFCI',
                    requirement: 'Outlets near water must have working GFCI protection. All outlets must be wired correctly.',
                    education: 'Why it matters: A GFCI (the outlet with "TEST" and "RESET" buttons) saves lives by preventing electric shock. It is required for bathrooms, kitchens, and garages. Incorrect wiring is a fire and shock hazard. What to look for: Use an outlet tester. Does the GFCI test button trip the outlet? Is it missing where it should be? Does the tester show correct wiring (e.g., no "open ground")? Is the outlet dead?',
                    defects: {
                        severe: [{ description: 'GFCI/AFCI inoperable', weight: 0.65 }, { description: 'GFCI missing where required', weight: 0.65 }, { description: 'Ungrounded/incorrect wiring', weight: 0.65 }, { description: 'Not energized', weight: 0.65 }]
                    }
                },
                {
                    name: 'Wires or Conductors',
                    requirement: 'NO exposed electrical wires or components are allowed. EVER.',
                    education: 'Why it matters: This is a LIFE-THREATENING, zero-tolerance hazard. Touching an exposed wire can kill someone instantly or start a fire. What to look for: Look for ANY exposed wires, missing outlet/switch covers, open holes in junction boxes, open slots in the breaker panel, or damaged wire insulation where you can see the metal. If you can see wire nuts, the cover is missing. This is an immediate, severe hazard.',
                    defects: {
                        severe: [{ description: 'Outlet/switch damaged/unsafe', weight: 2.50, lt: true }, { description: 'Damaged/missing cover', weight: 2.50 }, { description: 'Missing knockout', weight: 2.50 }, { description: 'Open breaker port', weight: 2.50 }, { description: '>1/2" gap noted', weight: 2.50 }, { description: 'Exposed wire nuts', weight: 2.50, lt: true }, { description: 'Unshielded/damaged wires', weight: 2.50, lt: true }]
                    }
                },
                {
                    name: 'Lighting',
                    requirement: 'The main, permanently installed lights in each room must work.',
                    education: 'Why it matters: Every room needs a reliable light source for safety. This does not apply to tenant-owned lamps. What to look for: Flip the switch for the main light fixture in each room (e.g., the ceiling light). If it doesn\'t turn on, it is a defect.',
                    defects: {
                        low: [{ description: 'Inoperable or missing', weight: 0.1 }]
                    }
                }
            ]
        },
        {
            category: 'Fire Safety',
            items: [
                {
                    name: 'Chimney',
                    requirement: 'The chimney and fireplace must be structurally safe.',
                    education: 'Why it matters: This is LIFE-THREATENING. A damaged fireplace or chimney can leak deadly carbon monoxide gas into the unit or let hot embers escape and start a fire. What to look for: Look for major cracks, missing bricks, or any damage to the structure. If it looks unsafe, it is.',
                    defects: {
                        severe: [{ description: 'Chimney/flue/firebox damaged', weight: 2.50, lt: true }]
                    }
                },
                {
                    name: 'Smoke / CO Detector',
                    requirement: 'Smoke and CO detectors must be installed correctly and must work.',
                    education: "Why it matters: This is LIFE-THREATENING. Smoke and Carbon Monoxide (CO) detectors are the single most important safety devices in a home. They provide the critical early warning needed to escape a fire or a deadly gas leak. A missing or non-working detector can be a fatal mistake. What to look for: 1) PLACEMENT: There must be a detector inside every bedroom, in the hallway outside sleeping areas, and on every level of the home. 2) VISUAL CHECK: Look at the detector itself. Is it cracked, broken, or are parts missing? Any physical damage means it needs to be replaced immediately. 3) POWER TEST: Press the 'Test' button on EVERY detector. If it doesn't beep loudly, it's useless and a critical failure. 4) AGE: Look for a date on the back or side. All detectors expire and must be replaced every 10 years. An expired detector cannot be trusted to work in an emergency.",
                    defects: {
                        severe: [{ description: 'Missing where required', weight: 2.50, lt: true }, { description: 'Inoperable (test failed, etc.)', weight: 2.50, lt: true }, { description: 'Improper placement', weight: 2.50, lt: true }, { description: 'Expired (if date is visible)', weight: 2.50, lt: true }]
                    }
                }
            ]
        },
        {
            category: 'General Health & Safety',
            items: [
                {
                    name: 'Call-for-Aid',
                    requirement: 'Emergency pull cords or buttons must work.',
                    education: 'Why it matters: In housing for elderly or disabled persons, these systems are a lifeline to get help in an emergency. If it doesn\'t work, someone might not get the help they need. What to look for: Activate the call system. Does it work as it should?',
                    defects: {
                        severe: [{ description: 'Inoperable', weight: 0.65 }]
                    }
                },
                {
                    name: 'Elevator',
                    requirement: 'The elevator must work and have a current inspection certificate.',
                    education: 'Why it matters: For people with mobility issues, a broken elevator can mean they are trapped in their apartment. An expired safety certificate means it may not be safe. What to look for: Is the elevator working? Find the inspection certificate inside the elevator. Is the date expired?',
                    defects: {
                        severe: [{ description: 'Inoperable', weight: 0.65 }, { description: 'Certificate missing or expired', weight: 0.65 }]
                    }
                },
                {
                    name: 'Guardrails',
                    requirement: 'Guardrails are required for any interior drop of 30 inches or more.',
                    education: 'Why it matters: This is LIFE-THREATENING. A fall from 30 inches or more inside the home (e.g., a loft, sunken living room, or staircase opening) can cause serious injury or death. What to look for: If there\'s a drop of 30" or more, a guardrail MUST be present. It must be at least 42" high and all its parts must be secure.',
                    defects: {
                        severe: [{ description: 'Missing where required', weight: 2.50, lt: true }, { description: 'Incorrect height', weight: 2.50 }, { description: 'Component damaged/missing', weight: 2.50 }]
                    }
                },
                {
                    name: 'Handrails',
                    requirement: 'Stairs with 4 or more steps must have a secure handrail.',
                    education: 'Why it matters: Handrails provide stability on stairs. A loose handrail is dangerous because it can break away when someone grabs it during a stumble, leading to a serious fall. What to look for: On any stairway with 4 or more steps, grab the handrail and shake it firmly. If it is loose, it\'s a defect.',
                    defects: {
                        moderate: [{ description: 'Loose', weight: 0.23 }]
                    }
                },
                {
                    name: 'Hot Water Heater',
                    requirement: 'The water heater must have its required safety valve and drain line.',
                    education: 'Why it matters: This is LIFE-THREATENING. The Temperature & Pressure (T&P) relief valve is a non-negotiable safety device that prevents the tank from exploding like a bomb if it malfunctions. It MUST have a pipe connected to it that runs down towards the floor to safely discharge scalding water. A missing valve or pipe is an explosion hazard.',
                    defects: {
                        severe: [{ description: 'T&P valve missing', weight: 2.50, lt: true }, { description: 'T&P discharge line missing or improper', weight: 2.50, lt: true }]
                    }
                },
                {
                    name: 'HVAC',
                    requirement: 'The unit must have a safe and working primary heat source.',
                    education: 'Why it matters: This is LIFE-THREATENING. Lack of heat can be deadly in cold weather, and a malfunctioning system can pose fire or carbon monoxide risks. The main furnace or heating system must work reliably. Unvented fuel-burning space heaters (like kerosene or propane heaters) are banned as a primary heat source because they release carbon monoxide and can kill people. Regular filter changes are crucial for both system efficiency and indoor air quality. A clogged filter restricts airflow, making the system work harder (increasing energy costs) and circulating dirty air. What to look for: Turn on the heat (and A/C if applicable). Does it work and produce appropriately heated or cooled air? Listen for any unusual noises like grinding or banging, and check the thermostat for proper operation. Also, always check for unvented space heaters being used as the main source of heat.',
                    defects: {
                        low: [{ description: 'Filter missing or damaged', weight: 0.1 }],
                        moderate: [{ description: 'No A/C and temp >85F', weight: 0.23 }],
                        severe: [{ description: 'Inoperable or no heat source', weight: 2.50, lt: true }, { description: 'Unvented fuel-burning heater', weight: 2.50, lt: true }]
                    }
                },
                {
                    name: 'Infestation',
                    requirement: 'The unit must be free from pests like roaches and mice.',
                    education: 'Why it matters: Cockroaches and mice can trigger asthma and allergies, especially in children. They contaminate food and are signs of unsanitary conditions. What to look for: Look for live or dead pests, droppings, or other evidence of an active infestation.',
                    defects: {
                        moderate: [{ description: 'Evidence of roaches, mice, etc.', weight: 0.23 }]
                    }
                },
                {
                    name: 'Lead-based Paint',
                    requirement: 'In units built before 1978, all paint must be in good condition.',
                    education: 'Why it matters: This is LIFE-THREATENING. Peeling or chipping lead paint creates toxic dust that can cause permanent brain damage in children. This is a major health hazard. What to look for: In any unit built before 1978, look for any paint that is chipping, cracking, or turning to dust. Any deteriorated area larger than 2 square feet is a severe, life-threatening hazard.',
                    defects: {
                        moderate: [{ description: '<2 sf of deterioration', weight: 0.23 }],
                        severe: [{ description: '>=2 sf of deterioration', weight: 2.50, lt: true }]
                    }
                },
                {
                    name: 'Mold & Mildew',
                    requirement: 'The unit must not have large areas of mold.',
                    education: 'Why it matters: Mold can cause serious respiratory problems and other health issues. It is caused by excess moisture that needs to be fixed. What to look for: Look for mold-like substances on walls, ceilings, or floors. An area larger than a sheet of paper (about 1 sq ft) is a defect.',
                    defects: {
                        moderate: [{ description: '>1 sf of mold-like-substance', weight: 0.23 }]
                    }
                },
                {
                    name: 'Sharp Edges',
                    requirement: 'The unit must be free of dangerous sharp hazards.',
                    education: 'Why it matters: A sharp piece of metal trim, broken glass, or damaged fixture can cause a very serious cut that requires stitches. What to look for: Look for any sharp edge inside the unit that is exposed and could easily injure someone.',
                    defects: {
                        severe: [{ description: 'Sharp edge likely to cause serious injury', weight: 0.65 }]
                    }
                },
                {
                    name: 'Stairs and Steps',
                    requirement: 'All parts of an interior staircase must be sound and in good condition.',
                    education: 'Why it matters: A broken or missing step can cause a severe fall. The entire staircase could collapse if the main supports (stringers) are rotten or cracked. What to look for: Check for missing, loose, or unlevel steps. Look for damage on the edge of the step (nosing). Inspect the support beams on the sides of the stairs (stringers) for damage.',
                    defects: {
                        moderate: [{ description: 'Missing/loose/unlevel tread', weight: 0.23 }, { description: 'Nosing damage', weight: 0.23 }, { description: 'Stringer damaged', weight: 0.23 }]
                    }
                },
                {
                    name: 'Trip Hazard',
                    requirement: 'Floors must be level and even.',
                    education: 'Why it matters: A small bump, a tear in the carpet, or a raised threshold can easily cause someone to trip and get seriously hurt. What to look for: Look for any spot on the floor or at a doorway that is uneven by more than 3/4 of an inch.',
                    defects: {
                        moderate: [{ description: '¾ inch vertical deviation', weight: 0.23 }]
                    }
                },
                {
                    name: 'Water Supply',
                    requirement: 'The unit must have both hot and cold running water.',
                    education: 'Why it matters: This is LIFE-THREATENING. Running water is essential for basic hygiene and sanitation. A unit without water is not habitable. What to look for: Turn on a faucet in the kitchen and a bathroom. Is there running water? Does the hot water get hot?',
                    defects: {
                        severe: [{ description: 'No hot or cold water in unit', weight: 2.50, lt: true }]
                    }
                }
            ]
        },
        {
            category: 'Structure & Materials',
            items: [
                {
                    name: 'Ceiling',
                    requirement: 'Ceilings must be intact and not in danger of collapsing.',
                    education: 'Why it matters: A large hole is a hazard. A ceiling that is sagging or buckling is a sign of potential collapse, which could seriously injure someone. This indicates a major structural or water problem. What to look for: Look for holes larger than a sheet of paper. Look for any areas that are sagging, bowing, or look like they are about to fall.',
                    defects: {
                        moderate: [{ description: 'Hole >1 sf', weight: 0.23 }],
                        severe: [{ description: 'Buckling/sagging/failing', weight: 0.65 }]
                    }
                },
                {
                    name: 'Floor',
                    requirement: 'Floors must be solid and free of holes.',
                    education: 'Why it matters: A hole in the floor is a clear hazard someone can fall through or trip on. A floor that feels soft or spongy when you walk on it can be a sign of rot and structural failure. What to look for: Are there any holes in the floor? Walk across the floor. Does it feel bouncy or soft underfoot?',
                    defects: {
                        moderate: [{ description: 'Hole', weight: 0.23 }],
                        severe: [{ description: 'Spongy/soft/failing', weight: 0.65 }]
                    }
                },
                {
                    name: 'Leaks',
                    requirement: 'There must be no active water leaks.',
                    education: 'Why it matters: An active leak causes property damage, creates a slip hazard, and leads to mold. Water leaking near electrical fixtures is a fire and electrocution risk. What to look for: Look for dripping water, not just old stains. Check under sinks and around toilets. Look at ceilings for drips.',
                    defects: {
                        moderate: [{ description: 'Stain, but not actively leaking', weight: 0.23 }],
                        severe: [{ description: 'Active, running water leak', weight: 0.65 }]
                    }
                },
                {
                    name: 'Walls',
                    requirement: 'Walls must be intact and structurally sound.',
                    education: 'Why it matters: A large hole in the wall is a hazard and can let pests travel between units. A wall that is bowing or bulging is a sign of a serious structural problem. What to look for: Look for holes larger than a sheet of paper. Look at the walls from an angle. Do they look like they are bulging or leaning?',
                    defects: {
                        moderate: [{ description: 'Hole >1 sf', weight: 0.23 }],
                        severe: [{ description: 'Buckling/bowing/failing', weight: 0.65 }]
                    }
                },
                {
                    name: 'Window',
                    requirement: 'Windows must work, lock, and be free of broken glass.',
                    education: 'Why it matters: A window that won\'t lock is a security risk. Broken glass is a major safety hazard. A window that won\'t open can be a problem in a fire if it\'s a designated escape route. What to look for: Can the window be closed and locked? Is the glass broken or missing? If it is a fire escape window, does it open?',
                    defects: {
                        low: [{ description: 'Screen damaged/missing', weight: 0.1 }],
                        moderate: [{ description: 'Hardware damaged/missing', weight: 0.23 }, { description: 'Thermal seal broken', weight: 0.23 }, { description: 'Missing or won\'t stay open', weight: 0.23 }],
                        severe: [{ description: 'Won\'t close/lock', weight: 0.65 }, { description: 'Glass broken/missing', weight: 0.65 }, { description: 'Fire escape window inoperable', weight: 0.65 }]
                    }
                }
            ]
        }
    ]
};

// --- TYPE DEFINITIONS --- //
type Defect = {
    description: string;
    weight: number;
    lt?: boolean;
};

type Note = {
    text: string;
    audio?: Blob;
    audioURL?: string;
    photo?: File;
    photoURL?: string;
};

type DefectCounts = Record<string, number>;
type Notes = Record<string, Note>;

// --- REACT COMPONENT --- //
const App = () => {
    const [screen, setScreen] = useState('setup'); // setup, inspection, report
    const [totalUnits, setTotalUnits] = useState('');
    const [sampleSize, setSampleSize] = useState(0);
    const [propertyInfo, setPropertyInfo] = useState({ name: '', address: '' });
    const [defectCounts, setDefectCounts] = useState<DefectCounts>({});
    const [notes, setNotes] = useState<Notes>({});
    const [activeTab, setActiveTab] = useState('outside'); // outside, inside
    const [selectedUnit, setSelectedUnit] = useState(1);
    const [modalInfo, setModalInfo] = useState<{ name: string; requirement: string; education: string } | null>(null);
    const [severityFilters, setSeverityFilters] = useState(['low', 'moderate', 'severe']);
    const [lastSaved, setLastSaved] = useState<string | null>(null);


    // Audio Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [transcribingKey, setTranscribingKey] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingDefectKeyRef = useRef<string | null>(null);
    const [analyzingPhotoKey, setAnalyzingPhotoKey] = useState<string | null>(null);

    // --- Auto-save and Restore Logic --- //
    // 1. Restore from localStorage on initial load
    useEffect(() => {
        const savedDraft = localStorage.getItem('techspectorProDraft');
        if (savedDraft) {
            try {
                const draft = JSON.parse(savedDraft);
                const savedDate = new Date(draft.timestamp).toLocaleString();
                if (window.confirm(`An unsaved inspection from ${savedDate} was found. Would you like to restore it?`)) {
                    setPropertyInfo(draft.propertyInfo);
                    setTotalUnits(draft.totalUnits);
                    setSampleSize(draft.sampleSize);
                    setDefectCounts(draft.defectCounts);
                    setNotes(draft.notes);
                    setLastSaved(new Date(draft.timestamp).toLocaleTimeString());
                    setScreen('inspection');
                } else {
                    localStorage.removeItem('techspectorProDraft');
                }
            } catch (error) {
                console.error("Failed to parse saved draft:", error);
                localStorage.removeItem('techspectorProDraft');
            }
        }
    }, []); // Run only on initial mount

    // 2. Auto-save to localStorage every 30 seconds during inspection
    useEffect(() => {
        if (screen !== 'inspection') {
            return;
        }

        const intervalId = setInterval(() => {
            // Only store the text part of notes, as files/blobs are not serializable
            const notesToSave: Notes = {};
            Object.keys(notes).forEach(key => {
                if (notes[key]?.text) {
                    notesToSave[key] = { text: notes[key].text };
                }
            });

            const draft = {
                propertyInfo,
                totalUnits,
                sampleSize,
                defectCounts,
                notes: notesToSave,
                timestamp: new Date().toISOString(),
            };

            localStorage.setItem('techspectorProDraft', JSON.stringify(draft));
            setLastSaved(new Date().toLocaleTimeString());
        }, 30000); // Save every 30 seconds

        return () => clearInterval(intervalId); // Cleanup on component unmount or screen change
    }, [screen, defectCounts, notes, propertyInfo, totalUnits, sampleSize]);


    const calculateSampleSize = (numUnits: number) => {
        if (numUnits <= 0) return 0;
        if (numUnits === 1) return 1;
        if (numUnits <= 10) return Math.min(numUnits, 4);
        if (numUnits <= 20) return 6;
        if (numUnits <= 30) return 7;
        if (numUnits <= 40) return 8;
        if (numUnits <= 50) return 9;
        if (numUnits <= 60) return 10;
        if (numUnits <= 70) return 11;
        if (numUnits <= 80) return 12;
        if (numUnits <= 90) return 13;
        if (numUnits <= 100) return 14;
        if (numUnits <= 200) return 17;
        if (numUnits <= 300) return 19;
        if (numUnits <= 400) return 20;
        if (numUnits <= 500) return 21;
        return 23;
    };

    const handleTotalUnitsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setTotalUnits(value);
        const numUnits = parseInt(value, 10);
        if (!isNaN(numUnits) && numUnits > 0) {
            setSampleSize(calculateSampleSize(numUnits));
        } else {
            setSampleSize(0);
        }
    };

    const handlePropertyInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPropertyInfo({ ...propertyInfo, [e.target.name]: e.target.value });
    };

    const startInspection = () => {
        if (parseInt(totalUnits, 10) > 0) {
            // Clear any previous state and drafts before starting a new inspection
            localStorage.removeItem('techspectorProDraft');
            setDefectCounts({});
            setNotes({});
            setLastSaved(null);
            setScreen('inspection');
        } else {
            alert('Please enter a valid number of total units.');
        }
    };
    
    const startRecording = async (defectKey: string) => {
        if (isRecording) return;
        recordingDefectKeyRef.current = defectKey;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const audioUrl = URL.createObjectURL(audioBlob);
                setNotes(prev => ({
                    ...prev,
                    [defectKey]: {
                        ...prev[defectKey],
                        text: prev[defectKey]?.text || '',
                        audio: audioBlob,
                        audioURL: audioUrl,
                    }
                }));
                 // Clean up the stream tracks
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Error starting recording:", err);
            alert("Could not start recording. Please ensure microphone permissions are granted.");
            recordingDefectKeyRef.current = null;
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            recordingDefectKeyRef.current = null;
        }
    };

    const handleTranscribe = async (defectKey: string) => {
        const note = notes[defectKey];
        if (!note?.audio) return;

        setTranscribingKey(defectKey);
        try {
            const base64Audio = await blobToBase64(note.audio);

            const audioPart = {
                inlineData: {
                    mimeType: note.audio.type,
                    data: base64Audio,
                },
            };

            const textPart = {
                text: "Transcribe the following audio recording of a property inspector's spoken note for a defect report. The transcription should be clean and accurate."
            };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [audioPart, textPart] },
            });

            const transcribedText = response.text;

            // Append transcribed text and remove audio draft
            setNotes(prevNotes => {
                const newNotes = { ...prevNotes };
                const currentNote = newNotes[defectKey] || { text: '' };
                const existingText = currentNote.text || '';

                newNotes[defectKey] = {
                    ...currentNote,
                    text: (existingText ? existingText.trim() + '\n' : '') + transcribedText,
                    audio: undefined,
                    audioURL: undefined,
                };
                 // Clean up the object URL
                if (currentNote.audioURL) {
                    URL.revokeObjectURL(currentNote.audioURL);
                }
                return newNotes;
            });

        } catch (error) {
            console.error("Transcription failed:", error);
            alert("Failed to transcribe audio. Please try again. Check the console for more details.");
        } finally {
            setTranscribingKey(null);
        }
    };
    
     const handlePhotoUpload = (key: string, file: File) => {
        const oldNote = notes[key];
        if (oldNote?.photoURL) {
            URL.revokeObjectURL(oldNote.photoURL);
        }

        const photoURL = URL.createObjectURL(file);
        setNotes(prev => ({
            ...prev,
            [key]: { ...prev[key], text: prev[key]?.text || '', photo: file, photoURL: photoURL }
        }));
    };

    // FIX: Correctly handle photo removal to avoid type errors.
    // The previous implementation could create an invalid state object if `prev[key]` was undefined,
    // which does not conform to the `Note` type because it lacks a required `text` property.
    // This version safely checks for an existing note before modification, ensuring type safety.
    const removePhoto = (key: string) => {
        const noteToRemove = notes[key];
        if (noteToRemove?.photoURL) {
            URL.revokeObjectURL(noteToRemove.photoURL);
        }
        setNotes(prev => {
            const existingNote = prev[key];
            if (!existingNote) {
                // If note doesn't exist, do nothing. This prevents creating an invalid note object.
                return prev;
            }
            const { photo, photoURL, ...restOfNote } = existingNote;
            return { ...prev, [key]: restOfNote };
        });
    };

    const handleAnalyzePhoto = async (key: string, item: any, defect: Defect) => {
        const note = notes[key];
        if (!note?.photo) return;

        setAnalyzingPhotoKey(key);
        try {
            const base64Photo = await blobToBase64(note.photo);

            const imagePart = {
                inlineData: {
                    mimeType: note.photo.type,
                    data: base64Photo,
                },
            };

            const textPart = {
                text: `Analyze this image from a property inspection regarding the item "${item.name}". The specific defect being recorded is: "${defect.description}". Identify and describe any visible issues in the image that are relevant to this defect. Provide a concise, one-sentence description of the issue shown in the photo, suitable for an inspection report.`,
            };
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [imagePart, textPart] },
            });

            const analysisText = response.text;

            setNotes(prevNotes => {
                const currentNote = prevNotes[key] || { text: '' };
                const existingText = currentNote.text || '';
                return {
                    ...prevNotes,
                    [key]: {
                        ...currentNote,
                        text: (existingText ? existingText.trim() + '\n' : '') + `AI Analysis: ${analysisText}`,
                    }
                };
            });

        } catch (error) {
            console.error("Photo analysis failed:", error);
            alert("Failed to analyze photo. Please try again. Check the console for more details.");
        } finally {
            setAnalyzingPhotoKey(null);
        }
    };


    const updateDefectCount = (key: string, change: number) => {
        setDefectCounts(prev => {
            const newCount = (prev[key] || 0) + change;
            return { ...prev, [key]: Math.max(0, newCount) };
        });
    };
    
    const updateNoteText = (key: string, text: string) => {
        setNotes(prev => ({
            ...prev,
            [key]: { ...prev[key], text: text }
        }));
    };

    const { outsideScore, insideScore, finalScore, failing, lifeThreateningDefects } = useMemo(() => {
        let outsideWeight = 0;
        let insideWeight = 0;
        let lifeThreateningDefects: string[] = [];

        Object.entries(defectCounts).forEach(([key, count]) => {
            if (count > 0) {
                const [location, catIndex, itemIndex, severity, defectIndex] = key.split('-');
                const defectList = location === 'outside' ? DEFECT_DATA.outside : DEFECT_DATA.inside;
                const category = defectList[parseInt(catIndex, 10)];
                const item = category?.items[parseInt(itemIndex, 10)];
                const defect = item?.defects[severity]?.[parseInt(defectIndex, 10)];

                if (defect) {
                    const totalWeight = defect.weight * count;
                    if (location === 'outside') {
                        outsideWeight += totalWeight;
                    } else {
                        insideWeight += totalWeight;
                    }
                    if (defect.lt) {
                        lifeThreateningDefects.push(`${item.name}: ${defect.description} (x${count})`);
                    }
                }
            }
        });

        const numUnits = parseInt(totalUnits, 10);
        const unitWeight = (insideWeight / (sampleSize > 0 ? sampleSize : 1)) * (numUnits > 0 ? numUnits : 1);
        const totalDeductions = outsideWeight + unitWeight;
        const finalScore = Math.max(0, 100 - totalDeductions);
        
        const outsideScore = Math.max(0, 100 - outsideWeight).toFixed(2);
        const insideScoreVal = Math.max(0, 100 - unitWeight);

        const failing = finalScore < 60 || unitWeight >= 30 || outsideWeight >= 40 || lifeThreateningDefects.length > 0;

        return {
            outsideScore,
            insideScore: insideScoreVal.toFixed(2),
            finalScore: finalScore.toFixed(2),
            failing,
            lifeThreateningDefects
        };
    }, [defectCounts, totalUnits, sampleSize]);

    const collectedDefects = useMemo(() => {
      const defects: any[] = [];
      Object.entries(defectCounts).forEach(([key, count]) => {
          if (count > 0) {
              const [location, catIndex, itemIndex, severity, defectIndex] = key.split('-');
              const defectList = location === 'outside' ? DEFECT_DATA.outside : DEFECT_DATA.inside;
              const item = defectList[parseInt(catIndex, 10)].items[parseInt(itemIndex, 10)];
              const defect = item.defects[severity][parseInt(defectIndex, 10)];
              const noteText = notes[key]?.text || '';
              
              // Find which unit(s) this defect applies to, if inside
              const defectLocation = location === 'outside' ? 'Outside / Common' : `Unit ${key.split('-').pop()}`;

              defects.push({
                  ...defect,
                  itemName: item.name,
                  severity,
                  count,
                  note: noteText,
                  location: key.startsWith('outside') ? 'Outside' : `Unit ${key.split('-')[5]}`
              });
          }
      });
      return defects;
    }, [defectCounts, notes]);
    
    const getDefectsForReport = () => {
        const result: any[] = [];
        Object.entries(defectCounts).forEach(([key, count]) => {
            if (count > 0) {
                const [location, catIndex, itemIndex, severity, defectIndex, unitNum] = key.split('-');
                const defectList = location === 'outside' ? DEFECT_DATA.outside : DEFECT_DATA.inside;
                const item = defectList[parseInt(catIndex)].items[parseInt(itemIndex)];
                const defect = item.defects[severity][parseInt(defectIndex)];
                result.push({
                    location: location === 'outside' ? 'Outside' : `Unit ${unitNum}`,
                    itemName: item.name,
                    description: defect.description,
                    severity,
                    count,
                    notes: notes[key]?.text || ''
                });
            }
        });
        return result.sort((a, b) => a.location.localeCompare(b.location));
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();
        const defects = getDefectsForReport();
        const today = new Date().toLocaleDateString();
        const finalY = 70;
        let startY = finalY + 35;

        // 1. Title
        doc.setFontSize(22);
        doc.text("Inspection Report", 105, 20, { align: 'center' });

        // 2. Property Info
        doc.setFontSize(12);
        doc.text(`Property: ${propertyInfo.name}`, 14, 35);
        doc.text(`Address: ${propertyInfo.address}`, 14, 42);
        doc.text(`Date: ${today}`, 14, 49);
        doc.text(`Units: ${totalUnits} total / ${sampleSize} inspected`, 14, 56);

        // 3. Score Summary
        doc.setFontSize(16);
        doc.text("Summary", 14, finalY);
        doc.setFontSize(12);
        doc.text(`Outside Score: ${outsideScore}`, 14, finalY + 7);
        doc.text(`Inside Score: ${insideScore}`, 14, finalY + 14);
        
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(failing ? '#f44336' : '#4caf50');
        doc.text(`Final Score: ${finalScore} (${failing ? 'FAIL' : 'PASS'})`, 14, finalY + 24);
        doc.setTextColor(0);
        doc.setFont('helvetica', 'normal');

        // 4. Life-Threatening Defects
        if (lifeThreateningDefects.length > 0) {
            doc.setFontSize(16);
            doc.setTextColor('#f44336');
            doc.text("Life-Threatening Defects Found", 14, startY);
            doc.setTextColor(0);
            doc.setFontSize(10);
            
            let listY = startY + 7;
            lifeThreateningDefects.forEach(defect => {
                const lines = doc.splitTextToSize(`• ${defect}`, 180);
                doc.text(lines, 16, listY);
                listY += (lines.length * 5);
            });
            startY = listY + 5;
        }

        // 5. Defects Table
        if (defects.length > 0) {
            const tableHead = [['Location', 'Item', 'Severity', 'Description', 'Count', 'Notes']];
            const tableBody = defects.map(d => [
                d.location,
                d.itemName,
                d.severity,
                d.description,
                d.count,
                d.notes || 'N/A'
            ]);

            autoTable(doc, {
                head: tableHead,
                body: tableBody,
                startY: startY,
                theme: 'striped',
                headStyles: { fillColor: [22, 22, 22] },
            });
        } else {
            doc.setFontSize(12);
            doc.text("No defects recorded.", 14, startY);
        }

        // 6. Save
        const fileName = `${propertyInfo.name.replace(/\s/g, '_') || 'Property'}_Inspection_Report.pdf`;
        doc.save(fileName);

        // 7. Clear the saved draft after successful export
        localStorage.removeItem('techspectorProDraft');
        alert('Report exported successfully. The saved draft has been cleared.');
        setLastSaved(null);
    };


    const SetupScreen = () => (
        <div className="screen setup-screen">
            <div className="card">
                <h2 className="card-title">Property Information</h2>
                <div className="form-group">
                    <label htmlFor="name">Property Name</label>
                    <input type="text" id="name" name="name" className="form-input" value={propertyInfo.name} onChange={handlePropertyInfoChange} />
                </div>
                <div className="form-group">
                    <label htmlFor="address">Property Address</label>
                    <input type="text" id="address" name="address" className="form-input" value={propertyInfo.address} onChange={handlePropertyInfoChange} />
                </div>
                <div className="form-group">
                    <label htmlFor="totalUnits">Total Number of Units</label>
                    <input type="number" id="totalUnits" className="form-input" value={totalUnits} onChange={handleTotalUnitsChange} placeholder="e.g., 100" />
                </div>
                 {sampleSize > 0 && (
                    <div className="sample-size-info">
                        <p>You need to inspect <span>{sampleSize}</span> unit{sampleSize > 1 ? 's' : ''}.</p>
                    </div>
                )}
            </div>
            <button onClick={startInspection} className="btn btn-primary btn-full" disabled={!totalUnits || parseInt(totalUnits) <= 0}>Start Inspection</button>
        </div>
    );

    const InspectableItem = ({ item, categoryIndex, itemIndex, location }) => {
        const baseKey = `${location}-${categoryIndex}-${itemIndex}`;

        return (
            <div className="inspectable-item">
                <div className="item-header">
                    <h3 className="item-name">{item.name}</h3>
                    <button className="learn-more-btn" onClick={() => setModalInfo(item)} aria-label={`More info about ${item.name}`}>
                        Learn More
                    </button>
                </div>

                {Object.entries(item.defects).map(([severity, defectList]) => (
                    <div key={severity} className="severity-group" data-severity={severity}>
                        <h4 className="severity-title">{severity}</h4>
                        {(defectList as Defect[]).map((defect, defectIndex) => {
                            const unitSpecificKey = location === 'inside' ? `${baseKey}-${severity}-${defectIndex}-${selectedUnit}` : `${baseKey}-${severity}-${defectIndex}`;
                            const count = defectCounts[unitSpecificKey] || 0;
                            const note = notes[unitSpecificKey] || { text: '' };
                            const isRecordingThis = isRecording && recordingDefectKeyRef.current === unitSpecificKey;
                            const isTranscribingThis = transcribingKey === unitSpecificKey;
                            const isAnalyzingThis = analyzingPhotoKey === unitSpecificKey;

                            return (
                                <div key={defectIndex} className="defect-wrapper">
                                    <div className="defect">
                                        <p>{defect.description}</p>
                                        <div className="defect-controls">
                                            <button onClick={() => updateDefectCount(unitSpecificKey, -1)} disabled={count === 0} className="defect-btn" aria-label={`Decrease count for ${defect.description}`}>-</button>
                                            <span className="defect-count">{count}</span>
                                            <button onClick={() => updateDefectCount(unitSpecificKey, 1)} className="defect-btn" aria-label={`Increase count for ${defect.description}`}>+</button>
                                        </div>
                                    </div>
                                    <div className="notes-section">
                                        <textarea
                                            className="notes-textarea"
                                            placeholder="Add notes, or record/upload..."
                                            value={note.text}
                                            onChange={(e) => updateNoteText(unitSpecificKey, e.target.value)}
                                            rows={3}
                                            aria-label={`Notes for ${defect.description}`}
                                        />
                                        <div className="note-actions">
                                            <button
                                                onClick={() => {
                                                    if (isRecordingThis) {
                                                        stopRecording();
                                                    } else {
                                                        startRecording(unitSpecificKey);
                                                    }
                                                }}
                                                className={`btn btn-secondary btn-record ${isRecordingThis ? 'recording' : ''}`}
                                                disabled={isRecording && !isRecordingThis}
                                            >
                                                {isRecordingThis ? 'Stop' : 'Record'}
                                            </button>

                                            {!note.photoURL && (
                                                <label htmlFor={`photo-upload-${unitSpecificKey}`} className="btn btn-secondary btn-upload-photo">
                                                   Upload Photo
                                               </label>
                                           )}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                id={`photo-upload-${unitSpecificKey}`}
                                                style={{ display: 'none' }}
                                                onChange={(e) => {
                                                    if (e.target.files && e.target.files[0]) {
                                                        handlePhotoUpload(unitSpecificKey, e.target.files[0]);
                                                        e.target.value = '';
                                                    }
                                                }}
                                            />
                                            
                                            {note.audioURL && (
                                                <div className="audio-note-controls">
                                                    <audio src={note.audioURL} controls aria-label={`Playback of recorded note`} />
                                                    <button
                                                        onClick={() => handleTranscribe(unitSpecificKey)}
                                                        disabled={isTranscribingThis || isRecording}
                                                        className="btn btn-primary btn-transcribe"
                                                    >
                                                        {isTranscribingThis ? 'Transcribing...' : 'Transcribe'}
                                                    </button>
                                                </div>
                                            )}

                                            {note.photoURL && (
                                                <div className="photo-preview-container">
                                                    <img src={note.photoURL} alt="Defect preview" className="photo-preview-thumb" />
                                                    <div className="photo-preview-actions">
                                                        <button
                                                            onClick={() => handleAnalyzePhoto(unitSpecificKey, item, defect)}
                                                            disabled={isAnalyzingThis}
                                                            className="btn btn-primary btn-analyze-photo"
                                                        >
                                                            {isAnalyzingThis ? 'Analyzing...' : 'Analyze with AI'}
                                                        </button>
                                                         <button onClick={() => removePhoto(unitSpecificKey)} className="btn-remove-photo" aria-label="Remove photo">&times;</button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        );
    };

    const InspectionScreen = () => {
        const data = activeTab === 'outside' ? DEFECT_DATA.outside : DEFECT_DATA.inside;
        return (
            <div className="screen inspection-screen">
                <div className="tabs">
                    <button className={`tab ${activeTab === 'outside' ? 'active' : ''}`} onClick={() => setActiveTab('outside')}>Outside / Common Areas</button>
                    <button className={`tab ${activeTab === 'inside' ? 'active' : ''}`} onClick={() => setActiveTab('inside')}>Inside Units</button>
                </div>

                {activeTab === 'inside' && (
                    <div className="unit-selector card">
                        <label htmlFor="unit-select">Select Unit to Inspect:</label>
                        <select id="unit-select" value={selectedUnit} onChange={e => setSelectedUnit(parseInt(e.target.value))}>
                            {[...Array(sampleSize)].map((_, i) => (
                                <option key={i + 1} value={i + 1}>Unit {i + 1}</option>
                            ))}
                        </select>
                    </div>
                )}

                {data.map((category, catIndex) => (
                    <details key={catIndex} className="accordion-category" open>
                        <summary className="accordion-header">
                            <h2 className="accordion-title">{category.category}</h2>
                            <span className="accordion-toggle">+</span>
                        </summary>
                        <div className="accordion-content">
                            {category.items.map((item, itemIndex) => (
                                <InspectableItem
                                    key={itemIndex}
                                    item={item}
                                    categoryIndex={catIndex}
                                    itemIndex={itemIndex}
                                    location={activeTab}
                                />
                            ))}
                        </div>
                    </details>
                ))}

                <div className="score-footer">
                    <div className="score-item">
                        <div className="score-value">{outsideScore}</div>
                        <div className="score-label">Outside Score</div>
                    </div>
                    <div className="score-item">
                        <div className="score-value">{insideScore}</div>
                        <div className="score-label">Inside Score</div>
                    </div>
                    <div className="score-item">
                        <div className="score-value" style={{ color: failing ? 'var(--danger-color)' : 'var(--text-color)' }}>{finalScore}</div>
                        <div className="score-label">Final Score</div>
                    </div>
                    <div className="finish-button-container">
                        <button className="btn btn-secondary" onClick={() => setScreen('report')}>Finish & View Report</button>
                    </div>
                    {lastSaved && <div className="save-status">Draft saved at {lastSaved}</div>}
                </div>
            </div>
        );
    };
    
    const ReportScreen = () => {
        const defects = getDefectsForReport();

        const handleFilterToggle = (severity: string) => {
            setSeverityFilters(prev =>
                prev.includes(severity)
                    ? prev.filter(s => s !== severity)
                    : [...prev, severity]
            );
        };

        const filteredDefects = defects.filter(d => severityFilters.includes(d.severity));

        return (
            <div className="screen report-screen">
                <div className="card">
                     <h2 className="card-title">Inspection Report</h2>
                     <p><strong>Property:</strong> {propertyInfo.name}</p>
                     <p><strong>Address:</strong> {propertyInfo.address}</p>
                     <p><strong>Total Units:</strong> {totalUnits} | <strong>Units Inspected:</strong> {sampleSize}</p>
                </div>
                
                <div className="report-summary">
                    <div className={`summary-card ${failing ? 'fail' : 'pass'}`}>
                        <div className="summary-card-title">Final Score</div>
                        <div className={`summary-card-value ${failing ? 'fail' : 'pass'}`}>{finalScore}</div>
                    </div>
                     <div className={`summary-card ${failing ? 'fail' : 'pass'}`}>
                        <div className="summary-card-title">Result</div>
                        <div className={`summary-card-value ${failing ? 'fail' : 'pass'}`}>{failing ? 'FAIL' : 'PASS'}</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-card-title">Outside Score</div>
                        <div className="summary-card-value">{outsideScore}</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-card-title">Inside Score</div>
                        <div className="summary-card-value">{insideScore}</div>
                    </div>
                </div>

                {lifeThreateningDefects.length > 0 && (
                     <div className="card">
                         <h3 className="defect-list-title" style={{color: 'var(--danger-color)'}}>Life-Threatening Defects Found</h3>
                         <div className="defect-list">
                            <ul>
                                {lifeThreateningDefects.map((desc, i) => <li key={i}>{desc}</li>)}
                            </ul>
                         </div>
                    </div>
                )}
                
                <div className="card">
                    <div className="card-header-flex">
                        <h3 className="defect-list-title">All Recorded Defects</h3>
                        <div className="filter-controls">
                            {(['low', 'moderate', 'severe'] as const).map(sev => (
                                <button
                                    key={sev}
                                    onClick={() => handleFilterToggle(sev)}
                                    className={`btn-filter severity-${sev} ${severityFilters.includes(sev) ? 'active' : ''}`}
                                    aria-pressed={severityFilters.includes(sev)}
                                >
                                    {sev}
                                </button>
                            ))}
                        </div>
                    </div>
                     {filteredDefects.length === 0 ? (
                        <p>No defects recorded{defects.length > 0 ? ' for the selected filters.' : '.'}</p>
                     ) : (
                        <div className="defect-list">
                            <ul>
                                {filteredDefects.map((d, i) => (
                                    <li key={i}>
                                        <div className="defect-report-item">
                                            <div className="defect-report-main">
                                                <span className="defect-list-loc">{d.location}</span>
                                                <span className="defect-list-desc">{d.count}x {d.itemName}: {d.description}</span>
                                                <span className={`defect-list-sev defect-list-sev-${d.severity}`}>{d.severity}</span>
                                            </div>
                                            {d.notes && (
                                                <div className="defect-report-notes">
                                                    <strong>Notes:</strong> {d.notes}
                                                </div>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                     )}
                </div>
                
                <div className="report-actions">
                    <button className="btn btn-secondary" onClick={() => setScreen('inspection')}>Back to Inspection</button>
                    <button className="btn btn-primary" onClick={handleExportPDF}>Export as PDF</button>
                </div>
            </div>
        );
    };

    const Modal = () => {
        if (!modalInfo) return null;
        return (
            <div className="modal-overlay" onClick={() => setModalInfo(null)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <button className="modal-close-btn" onClick={() => setModalInfo(null)}>&times;</button>
                    <h3 className="modal-title">{modalInfo.name}</h3>
                    <div className="modal-section">
                        <h4>Requirement</h4>
                        <p>{modalInfo.requirement}</p>
                    </div>
                    <div className="modal-section">
                        <h4>Educational Information</h4>
                        <p>{modalInfo.education}</p>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            <header className="app-header">
                <h1>Techspector Pro</h1>
            </header>
            <main className="container">
                {screen === 'setup' && <SetupScreen />}
                {screen === 'inspection' && <InspectionScreen />}
                {screen === 'report' && <ReportScreen />}
            </main>
            <Modal />
        </>
    );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);
