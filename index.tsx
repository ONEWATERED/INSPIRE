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
                    education: 'Why it matters: This is LIFE-THREATENING. Lack of heat can be deadly in cold weather, and a malfunctioning system can pose fire or carbon monoxide risks. The main furnace or heating system must work reliably. Unvented fuel-burning space heaters (like kerosene or propane heaters) are banned as a primary heat source because they release carbon monoxide and can kill people. Regular filter changes are crucial for both system efficiency and indoor air quality. A clogged filter restricts airflow, making the system work harder (increasing energy costs) and circulating dirty air. What to look for: Turn on the heat (and A/C if applicable). Does