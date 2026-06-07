export const TUMOR_DATA = {
  "Glioma Tumor": {
    risk: "High",
    riskColor: "red",
    overview:
      "Gliomas originate from glial cells that support and protect neurons in the brain. They are among the most common and aggressive primary brain tumors, accounting for roughly 33% of all brain tumors.",
    symptoms: [
      "Persistent or worsening headaches",
      "Seizures (new onset)",
      "Progressive memory or cognitive changes",
      "Nausea and vomiting",
      "Vision or speech difficulties",
      "Personality or behavioral changes",
    ],
    diagnostics: [
      "Contrast-enhanced MRI for detailed imaging",
      "MR Spectroscopy to assess tumor chemistry",
      "CT scan for calcification detection",
      "Stereotactic biopsy for histological grading",
      "Genetic testing (IDH mutation, 1p/19q co-deletion, MGMT methylation)",
    ],
    treatments: [
      "Surgical resection (maximal safe removal)",
      "Radiation therapy (external beam or stereotactic)",
      "Chemotherapy (Temozolomide is standard)",
      "Targeted therapy based on molecular profiling",
      "Clinical trial enrollment when applicable",
    ],
    recommendations: [
      "Immediate consultation with a neuro-oncologist",
      "Comprehensive neurological examination",
      "Discuss surgical options and risks with neurosurgeon",
      "Genetic profiling of tumor tissue for treatment planning",
      "Establish regular follow-up MRI schedule",
    ],
    dietChart: {
      overview:
        "An anti-inflammatory, antioxidant-rich diet can support brain health and complement treatment. Emphasize whole foods, omega-3 fatty acids, and phytonutrients.",
      recommended: [
        {
          category: "Omega-3 Rich Foods",
          items: ["Wild salmon", "Sardines", "Mackerel", "Flaxseeds", "Chia seeds"],
          benefit: "Reduce neuroinflammation and support brain membrane integrity",
        },
        {
          category: "Antioxidant-Rich Foods",
          items: ["Blueberries", "Spinach", "Broccoli", "Kale", "Dark chocolate (70%+)"],
          benefit: "Combat oxidative stress linked to tumor progression",
        },
        {
          category: "Lean Proteins",
          items: ["Chicken breast", "Turkey", "Lentils", "Tofu", "Eggs"],
          benefit: "Essential for tissue repair and immune function during treatment",
        },
        {
          category: "Healthy Fats",
          items: ["Avocados", "Extra virgin olive oil", "Walnuts", "Almonds"],
          benefit: "Provide sustained energy and support cell repair mechanisms",
        },
        {
          category: "Whole Grains & Fiber",
          items: ["Quinoa", "Brown rice", "Oats", "Whole wheat bread"],
          benefit: "Provide stable energy without glucose spikes that can feed tumor cells",
        },
      ],
      avoid: [
        {
          category: "Processed & Fried Foods",
          items: ["Fast food", "Chips", "Packaged snacks", "Deep-fried items"],
          reason: "High in trans fats and additives that promote systemic inflammation",
        },
        {
          category: "Sugary Foods & Drinks",
          items: ["Sodas", "Candy", "Pastries", "White bread", "Fruit juices"],
          reason: "Excess sugar elevates insulin and may accelerate tumor cell metabolism",
        },
        {
          category: "Alcohol & Stimulants",
          items: ["Alcohol (all types)", "Excessive caffeine"],
          reason: "Interferes with treatment medications and impairs immune function",
        },
      ],
      supplements: [
        { name: "Vitamin D3", dose: "1000–2000 IU/day", note: "Consult doctor — may support immune function" },
        { name: "Omega-3 Fish Oil", dose: "1–2 g EPA+DHA/day", note: "Consult doctor before starting during chemotherapy" },
        { name: "Curcumin with Piperine", dose: "As prescribed", note: "Anti-inflammatory — inform your oncologist before use" },
      ],
      hydration: "Drink 8–10 glasses (2–2.5 L) of water daily. Herbal teas (green tea, chamomile) are beneficial. Avoid sugary drinks and alcohol entirely.",
      mealTiming:
        "Eat 5–6 small, balanced meals throughout the day. Avoid heavy meals within 3 hours of sleep. Maintain consistent meal times to regulate blood sugar and energy.",
    },
    lifestyleChanges: {
      exercise: [
        { activity: "Gentle walking", frequency: "20–30 minutes daily", note: "Even short walks improve circulation and mood" },
        { activity: "Light yoga or stretching", frequency: "3–4 times per week", note: "Avoid inversions; consult physiotherapist" },
        { activity: "Swimming (low-impact)", frequency: "2–3 times per week", note: "Excellent for cardiovascular health without joint strain" },
      ],
      sleep: [
        "Aim for 7–9 hours of quality sleep every night",
        "Keep a consistent sleep and wake schedule including weekends",
        "Use blackout curtains and maintain a cool, dark bedroom",
        "Avoid screens for at least 1 hour before bedtime",
      ],
      stressManagement: [
        "10–15 minutes of guided meditation or mindfulness daily",
        "Deep breathing exercises (4-7-8 technique) to calm the nervous system",
        "Journaling to express emotions and track symptom patterns",
        "Consider cognitive behavioral therapy (CBT) with a licensed therapist",
      ],
      avoid: [
        "All tobacco products and second-hand smoke exposure",
        "Alcohol consumption during and after treatment",
        "Extreme heat environments (saunas, hot tubs)",
        "High-contact sports or activities with head injury risk",
        "Prolonged unprotected sun exposure (especially during radiation)",
      ],
      mentalHealth: [
        "Join a brain tumor support group (in-person or online)",
        "Maintain regular social connections with family and friends",
        "Speak with a psycho-oncologist for emotional support during treatment",
      ],
      selfMonitoring: [
        "Keep a daily symptom diary: headaches, vision changes, mood, energy",
        "Record seizure activity (if applicable) with date, duration, and type",
        "Monitor and report any new or worsening neurological symptoms immediately",
        "Track weight weekly — report significant unexplained changes to your doctor",
      ],
    },
  },

  "Meningioma Tumor": {
    risk: "Medium",
    riskColor: "amber",
    overview:
      "Meningiomas arise from the meninges, the membranes surrounding the brain and spinal cord. They are the most common primary intracranial tumors and are typically benign (WHO Grade I), though some variants can be atypical or malignant.",
    symptoms: [
      "Gradual-onset headaches",
      "Visual disturbances or double vision",
      "Hearing loss or ringing in the ears",
      "Weakness in limbs",
      "Seizures (less common)",
      "Memory difficulties",
    ],
    diagnostics: [
      "Gadolinium-enhanced MRI (gold standard)",
      "CT scan to evaluate bone involvement",
      "MR Angiography for vascular assessment",
      "Hormonal panel (some meningiomas are hormone-responsive)",
      "Biopsy if atypical features are present",
    ],
    treatments: [
      "Observation with serial imaging (for small, asymptomatic tumors)",
      "Surgical resection (curative for most Grade I tumors)",
      "Stereotactic radiosurgery (Gamma Knife / CyberKnife)",
      "Fractionated radiation for larger or recurrent tumors",
      "Hormonal therapy in select cases",
    ],
    recommendations: [
      "Neurosurgical consultation for treatment planning",
      "Annual MRI surveillance if observation is chosen",
      "Ophthalmological evaluation if near optic pathways",
      "Discuss the benefits vs. risks of surgical intervention",
      "Monitor for recurrence even after successful treatment",
    ],
    dietChart: {
      overview:
        "A Mediterranean-style anti-inflammatory diet is recommended. Focus on reducing hormonal stimulation and supporting brain vascular health.",
      recommended: [
        {
          category: "Anti-Inflammatory Foods",
          items: ["Olive oil", "Turmeric", "Ginger", "Fatty fish", "Berries"],
          benefit: "Reduce inflammation around the tumor site and surrounding tissue",
        },
        {
          category: "Cruciferous Vegetables",
          items: ["Broccoli", "Cauliflower", "Brussels sprouts", "Cabbage"],
          benefit: "Contain sulforaphane which may inhibit tumor cell growth",
        },
        {
          category: "Calcium-Rich Foods",
          items: ["Low-fat dairy", "Fortified plant milk", "Leafy greens", "Almonds"],
          benefit: "Support bone health, especially important if on steroid medications",
        },
        {
          category: "Lean Proteins",
          items: ["Chicken", "Fish", "Legumes", "Eggs", "Greek yogurt"],
          benefit: "Support tissue repair and maintain muscle mass",
        },
        {
          category: "Fiber-Rich Foods",
          items: ["Oats", "Whole grain bread", "Beans", "Flaxseeds"],
          benefit: "Support gut health and reduce inflammation systemically",
        },
      ],
      avoid: [
        {
          category: "Hormone-Disrupting Foods",
          items: ["Soy in excess", "Non-organic dairy", "Conventional meat with hormones"],
          reason: "Some meningiomas have hormone receptors and may be stimulated by exogenous hormones",
        },
        {
          category: "Processed & High-Sodium Foods",
          items: ["Canned soups", "Processed meats", "Fast food", "Salty snacks"],
          reason: "High sodium worsens water retention and brain edema, especially if on steroids",
        },
        {
          category: "Alcohol & Tobacco",
          items: ["All alcoholic beverages", "Tobacco products"],
          reason: "Both linked to increased tumor recurrence risk and impaired healing",
        },
      ],
      supplements: [
        { name: "Vitamin D3", dose: "1000–2000 IU/day", note: "Especially important if sun exposure is limited" },
        { name: "Calcium", dose: "500–1000 mg/day", note: "Critical if prescribed corticosteroids — consult doctor" },
        { name: "Omega-3 Fish Oil", dose: "1 g/day", note: "May reduce peritumoral edema — discuss with neurosurgeon" },
      ],
      hydration: "Drink 8 glasses (2 L) of water daily. Limit caffeine to 1 cup of coffee per day. Herbal teas are recommended.",
      mealTiming:
        "Eat 4–5 balanced meals at consistent times. Avoid large meals before sleep. If on corticosteroids, eat regularly to manage blood sugar and weight.",
    },
    lifestyleChanges: {
      exercise: [
        { activity: "Brisk walking", frequency: "30 minutes, 5 days per week", note: "Excellent baseline activity for all fitness levels" },
        { activity: "Swimming or water aerobics", frequency: "2–3 times per week", note: "Low impact, supports cardiovascular health" },
        { activity: "Yoga (gentle/restorative)", frequency: "2–3 times per week", note: "Improves flexibility and reduces stress hormones" },
      ],
      sleep: [
        "Maintain 7–8 hours of sleep nightly to support immune recovery",
        "Sleep on your back or side with head slightly elevated if experiencing headaches",
        "Avoid napping for more than 30 minutes during the day",
        "Create a relaxing pre-sleep routine (reading, warm bath, light stretching)",
      ],
      stressManagement: [
        "Practice mindfulness meditation for 10–20 minutes daily",
        "Progressive muscle relaxation techniques before sleep",
        "Engage in hobbies that bring joy and mental distraction",
      ],
      avoid: [
        "Smoking and second-hand smoke exposure",
        "Exogenous hormones (certain contraceptives — discuss with doctor)",
        "Head trauma — avoid contact sports and high-risk activities",
        "Excessive alcohol consumption",
      ],
      mentalHealth: [
        "Connect with a meningioma support community",
        "Consider counseling or therapy for anxiety related to diagnosis",
        "Engage family members in understanding the condition",
      ],
      selfMonitoring: [
        "Track headache frequency, severity, and location in a diary",
        "Monitor vision changes: blurring, double vision, field loss",
        "Record any balance or coordination changes",
        "Note any limb weakness or cognitive changes for next appointment",
      ],
    },
  },

  "Pituitary Tumor": {
    risk: "Medium",
    riskColor: "amber",
    overview:
      "Pituitary tumors (adenomas) develop in the pituitary gland at the base of the brain. Most are benign and classified as micro-adenomas (<10mm) or macro-adenomas (≥10mm). They can cause hormonal imbalances and visual disturbances.",
    symptoms: [
      "Unexplained hormonal changes (growth, thyroid, cortisol, prolactin)",
      "Visual field defects (bitemporal hemianopsia)",
      "Chronic headaches",
      "Fatigue and weakness",
      "Menstrual irregularities or erectile dysfunction",
      "Unexpected weight changes",
    ],
    diagnostics: [
      "Dedicated pituitary MRI with thin cuts",
      "Complete hormonal panel (prolactin, GH, ACTH, TSH, LH, FSH)",
      "Formal visual field testing (perimetry)",
      "Inferior petrosal sinus sampling (for Cushing's disease)",
      "Bone density scan if hormonal abnormalities present",
    ],
    treatments: [
      "Medical therapy (dopamine agonists for prolactinomas)",
      "Trans-sphenoidal surgery (minimally invasive approach)",
      "Radiation therapy (stereotactic radiosurgery for residual/recurrent tumors)",
      "Hormone replacement therapy post-treatment",
      "Long-term endocrine monitoring",
    ],
    recommendations: [
      "Referral to an endocrinologist for hormonal evaluation",
      "Ophthalmological assessment of visual fields",
      "Discuss medication vs. surgical options",
      "Regular hormonal and imaging follow-up",
      "Evaluate impact on fertility and bone health",
    ],
    dietChart: {
      overview:
        "Diet must address the hormonal consequences of the tumor. Focus on stabilizing blood sugar, supporting adrenal and thyroid function, and maintaining bone density.",
      recommended: [
        {
          category: "Blood Sugar Stabilizing Foods",
          items: ["Oats", "Sweet potatoes", "Brown rice", "Legumes", "Non-starchy vegetables"],
          benefit: "Prevents insulin spikes that worsen cortisol dysregulation in Cushing's-type tumors",
        },
        {
          category: "Bone-Strengthening Foods",
          items: ["Low-fat milk", "Fortified plant milk", "Broccoli", "Almonds", "Sardines with bones"],
          benefit: "Critical for preventing osteoporosis caused by hormonal imbalances",
        },
        {
          category: "Lean Proteins",
          items: ["Fish", "Chicken", "Eggs", "Lentils", "Tofu"],
          benefit: "Support muscle preservation when growth hormone is dysregulated",
        },
        {
          category: "Iodine & Selenium Sources",
          items: ["Seafood", "Seaweed (in moderation)", "Brazil nuts", "Sunflower seeds"],
          benefit: "Support thyroid function which may be affected by pituitary dysregulation",
        },
        {
          category: "Anti-Inflammatory & Colorful Vegetables",
          items: ["Bell peppers", "Spinach", "Tomatoes", "Carrots", "Beets"],
          benefit: "Provide vitamins and antioxidants to support overall hormonal balance",
        },
      ],
      avoid: [
        {
          category: "High-Sugar & Refined Carbs",
          items: ["White bread", "Sugary cereals", "Soft drinks", "Cakes", "Candy"],
          reason: "Worsen insulin resistance and cortisol abnormalities common with pituitary tumors",
        },
        {
          category: "High-Sodium Foods",
          items: ["Processed meats", "Canned foods", "Fast food", "Soy sauce in excess"],
          reason: "Increases risk of hypertension and water retention linked to cortisol excess",
        },
        {
          category: "Alcohol & Stimulants",
          items: ["Alcohol", "Excessive caffeine", "Energy drinks"],
          reason: "Disrupts hormonal signaling and interferes with pituitary medication efficacy",
        },
      ],
      supplements: [
        { name: "Calcium + Vitamin D3", dose: "500 mg Ca + 1000 IU D3/day", note: "Essential for bone protection — confirm with endocrinologist" },
        { name: "Vitamin B Complex", dose: "B6, B9, B12 daily", note: "Supports nervous system and energy metabolism" },
        { name: "Magnesium Glycinate", dose: "200–400 mg/day", note: "Supports sleep, muscle function, and stress response" },
      ],
      hydration: "Drink 8–10 glasses of water daily. Avoid excessive fluid intake if diabetes insipidus is present — follow doctor's specific guidance.",
      mealTiming:
        "Eat 3 main meals and 2 small snacks at consistent times daily. Never skip breakfast — cortisol peaks in the morning and blood sugar stability is critical. Eat within 1 hour of waking.",
    },
    lifestyleChanges: {
      exercise: [
        { activity: "Moderate aerobic exercise (walking, cycling)", frequency: "30 minutes, 5 days per week", note: "Helps regulate cortisol and blood sugar" },
        { activity: "Weight-bearing exercises", frequency: "2–3 times per week", note: "Critical for bone density when hormonal status is impaired" },
        { activity: "Pilates or core strengthening", frequency: "2 times per week", note: "Improves posture and muscle strength affected by growth hormone changes" },
      ],
      sleep: [
        "7–8 hours of sleep is critical as growth hormone is primarily released during deep sleep",
        "Go to bed and wake at the same time every day to synchronize pituitary-driven hormonal cycles",
        "Treat any sleep apnea promptly — it significantly worsens pituitary function",
        "Avoid screen light 1 hour before sleep to preserve melatonin secretion",
      ],
      stressManagement: [
        "Cortisol management is essential: practice relaxation techniques morning and evening",
        "Yoga nidra (yogic sleep) is particularly beneficial for hormonal regulation",
        "Biofeedback therapy for stress-induced hormonal dysregulation",
      ],
      avoid: [
        "Smoking (worsens cardiovascular risk with hormonal changes)",
        "Excessive physical exertion if growth hormone levels are abnormal",
        "Skipping prescribed hormone replacement medications",
        "Alcohol (disrupts hormonal balance and liver metabolism of medications)",
      ],
      mentalHealth: [
        "Hormonal changes can cause depression and anxiety — seek psychological support proactively",
        "Connect with a pituitary tumor patient community for peer support",
        "Inform close family about mood-related symptoms so they can provide appropriate support",
      ],
      selfMonitoring: [
        "Track and record blood pressure readings weekly",
        "Monitor weight and waist circumference monthly",
        "Keep a visual symptom log: any changes in peripheral vision",
        "Note energy levels, mood, libido, and menstrual regularity for each endocrinology appointment",
      ],
    },
  },

  "No Tumor": {
    risk: "Low",
    riskColor: "emerald",
    overview:
      "No evidence of tumor was detected in the MRI scan. The brain structures appear within normal limits based on AI analysis. This is an encouraging result, though clinical correlation is always recommended.",
    symptoms: [],
    diagnostics: [
      "No immediate further imaging required",
      "Clinical correlation with presenting symptoms",
      "Consider follow-up scan if symptoms persist",
    ],
    treatments: [],
    recommendations: [
      "Share this result with your primary care physician",
      "Continue routine health check-ups",
      "Return for imaging if new neurological symptoms develop",
      "Maintain a healthy lifestyle for brain health",
      "Keep this report for medical records",
    ],
    dietChart: {
      overview:
        "Maintain a brain-healthy diet to support long-term neurological wellness and prevent future issues. The Mediterranean diet pattern is strongly recommended.",
      recommended: [
        {
          category: "Brain-Boosting Foods",
          items: ["Blueberries", "Dark leafy greens", "Wild salmon", "Walnuts", "Avocados"],
          benefit: "Protect neurons, improve cognition, and reduce long-term neurological risk",
        },
        {
          category: "Colorful Vegetables",
          items: ["Broccoli", "Bell peppers", "Sweet potatoes", "Beets", "Carrots"],
          benefit: "Rich in vitamins and antioxidants that maintain brain vascular health",
        },
        {
          category: "Lean Proteins",
          items: ["Fish", "Legumes", "Eggs", "Poultry", "Greek yogurt"],
          benefit: "Provide amino acids for neurotransmitter production and brain repair",
        },
        {
          category: "Healthy Fats",
          items: ["Olive oil", "Almonds", "Flaxseeds", "Chia seeds"],
          benefit: "Omega-3 fats are essential for brain membrane health and inflammation control",
        },
        {
          category: "Hydrating & Antioxidant Beverages",
          items: ["Green tea", "Herbal teas", "Coconut water", "Plain water"],
          benefit: "Green tea polyphenols have neuroprotective properties",
        },
      ],
      avoid: [
        {
          category: "Processed & Ultra-Processed Foods",
          items: ["Fast food", "Chips", "Processed meats", "Packaged snacks"],
          reason: "Associated with increased neuroinflammation and cognitive decline over time",
        },
        {
          category: "Excess Sugar",
          items: ["Sugary drinks", "Candy", "Pastries", "Sweetened cereals"],
          reason: "High sugar diet is linked to impaired brain function and metabolic disorders",
        },
        {
          category: "Excessive Alcohol",
          items: ["Heavy alcohol consumption", "Binge drinking"],
          reason: "Directly toxic to neurons and increases long-term neurological risk",
        },
      ],
      supplements: [
        { name: "Vitamin D3", dose: "1000 IU/day", note: "General brain health support — check blood levels annually" },
        { name: "Omega-3 Fish Oil", dose: "1 g/day", note: "If dietary fish intake is low — discuss with doctor" },
      ],
      hydration: "Drink 8 glasses (2 L) of water daily. Even mild dehydration impairs cognitive function. Include 1–2 cups of green tea daily for neuroprotection.",
      mealTiming:
        "Follow regular meal times with 3 main meals and optional healthy snacks. Avoid late-night eating. Intermittent fasting (12–14 hour overnight fast) may benefit long-term brain health.",
    },
    lifestyleChanges: {
      exercise: [
        { activity: "Aerobic exercise (running, cycling, swimming)", frequency: "150 minutes/week", note: "Strongest evidence-based intervention for long-term brain health" },
        { activity: "Strength/resistance training", frequency: "2 times per week", note: "Improves brain blood flow and BDNF levels" },
        { activity: "Mind-body exercise (yoga, tai chi)", frequency: "1–2 times per week", note: "Reduces cortisol and supports mental clarity" },
      ],
      sleep: [
        "Aim for 7–8 hours of quality sleep — critical for glymphatic brain waste clearance",
        "Maintain consistent sleep schedule 7 days a week",
        "Address any snoring or sleep apnea with your doctor",
        "Avoid alcohol before sleep — it severely disrupts sleep architecture",
      ],
      stressManagement: [
        "Practice mindfulness or meditation for 10–20 minutes daily",
        "Engage in creative activities that provide mental relaxation",
        "Maintain work-life balance and take regular breaks from screens",
      ],
      avoid: [
        "Tobacco in all forms",
        "Heavy or binge alcohol consumption",
        "Prolonged sedentary behavior — break up sitting every 45–60 minutes",
        "Chronic sleep deprivation",
      ],
      mentalHealth: [
        "Maintain strong social connections — social isolation increases neurological risk",
        "Engage in mentally stimulating activities: reading, puzzles, learning new skills",
        "Seek support if experiencing anxiety about the scan results",
      ],
      selfMonitoring: [
        "Note any new persistent headaches, vision changes, or balance issues",
        "Schedule annual general health check-ups",
        "Return for re-imaging if original symptoms worsen or new neurological symptoms develop",
      ],
    },
  },
};

export function getRiskLevel(prediction) {
  return TUMOR_DATA[prediction]?.risk || "Unknown";
}

export function getRiskColor(prediction) {
  const color = TUMOR_DATA[prediction]?.riskColor || "slate";
  const map = {
    red: {
      bg: "bg-red-100 dark:bg-red-900/30",
      text: "text-red-700 dark:text-red-400",
      ring: "ring-red-500",
      bar: "bg-red-500",
    },
    amber: {
      bg: "bg-amber-100 dark:bg-amber-900/30",
      text: "text-amber-700 dark:text-amber-400",
      ring: "ring-amber-500",
      bar: "bg-amber-500",
    },
    emerald: {
      bg: "bg-emerald-100 dark:bg-emerald-900/30",
      text: "text-emerald-700 dark:text-emerald-400",
      ring: "ring-emerald-500",
      bar: "bg-emerald-500",
    },
    slate: {
      bg: "bg-slate-100 dark:bg-slate-800",
      text: "text-slate-700 dark:text-slate-400",
      ring: "ring-slate-500",
      bar: "bg-slate-500",
    },
  };
  return map[color] || map.slate;
}

export function getMedicalData(prediction) {
  return TUMOR_DATA[prediction] || TUMOR_DATA["No Tumor"];
}
