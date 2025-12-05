# SPEECH-TO-TEXT SYSTEM IMPLEMENTATION PLAN (UPDATED)

## Real-Time Japanese Presentation Recording with Slide Synchronization and Teaching Analytics

---

## UPDATE SUMMARY

This document extends the original implementation plan with two new analytical features designed to help teachers improve their presentation quality:

1. **Context Extraction System**: Automatically identifies and extracts key teaching moments from recorded lectures
2. **Teaching Intention Analysis System**: Classifies speech segments to reveal teaching patterns and strategies

These additions transform the system from a pure transcription tool into an educational analytics platform while maintaining feasibility for undergraduate-level implementation.

---

## PHASE 5: TEACHING ANALYTICS FEATURES (Week 9-12)

### Phase Overview

Phase 5 adds post-processing analytical capabilities that help teachers understand and improve their presentation delivery. Unlike real-time matching in Phase 4, these features analyze recorded sessions after completion using rule-based algorithms and simple NLP techniques. The focus is on providing actionable insights without requiring complex machine learning infrastructure.

### Week 9-10: Context Extraction System

**Feature Purpose**

After recording, the system automatically identifies important teaching moments where the teacher provided key explanations, emphasized critical points, or connected concepts. This helps teachers review their presentation structure and identify areas that received appropriate attention versus areas that may need more emphasis in future sessions.

**Core Components**

The context extraction system consists of four main components working together to identify significant teaching moments.

The **Segment Importance Scorer** evaluates each transcript segment using multiple heuristics. Longer segments (over thirty words) receive higher base scores as they typically contain substantial explanations. Segments with high keyword density (more than three matches to slide keywords) indicate focused discussion of core concepts. Segments occurring during slide transitions (within five seconds of moving to new slide) often contain summaries or introductions. Segments with high speech-to-text confidence (above ninety percent) are more reliable for analysis. The scorer combines these factors into a normalized importance score from zero to one hundred.

The **Context Type Classifier** categorizes each high-scoring segment into meaningful types using keyword pattern matching. Explanation contexts contain words like "つまり" (that is), "例えば" (for example), "なぜなら" (because), or phrases indicating elaboration. Emphasis contexts use intensifiers like "重要" (important), "注意" (attention), "覚えて" (remember), or repetition of key terms. Example contexts include phrases like "例として" (as an example), "実際に" (in reality), or references to specific cases. Summary contexts appear with "まとめると" (to summarize), "結論" (conclusion), "以上" (above all), typically near slide end. Question contexts contain interrogative patterns "どう" (how), "なぜ" (why), "何" (what), suggesting interactive teaching.

The **Context Aggregator** groups related segments that discuss the same topic. It uses slide boundaries as natural grouping points and merges consecutive segments of the same type that share significant keyword overlap (over fifty percent common keywords). The aggregator creates context objects containing the combined text, time range, associated slide, importance score, and type classification.

The **Export Generator** produces analysis files in accessible formats. The JSON export contains structured data with all context objects including timestamps, scores, and classifications for programmatic access. The formatted text report presents contexts organized by slide with readable summaries suitable for teacher review. The timeline visualization marks important moments on a session timeline using simple HTML/CSS for quick scanning.

**Implementation Approach**

Use straightforward Python implementations avoiding complex dependencies. The MeCab Japanese tokenizer handles word segmentation for keyword matching. Simple regular expressions detect linguistic patterns indicating context types. The keyword dictionary from Phase 2 (index.json) provides the reference for density calculations. All processing happens asynchronously after recording completes, so performance under five minutes for typical one-hour lecture is acceptable.

Store analysis results in GCS under `presentations/{id}/analysis/contexts.json` with schema including context_id, start_time, end_time, slide_page, text, context_type, importance_score, keywords_matched array, and teacher_notes (initially empty). The system maintains version history allowing teachers to see how their presentation patterns evolve across recordings.

**User Interface Requirements**

Create a dedicated "Context Analysis" page accessible after recording completion. Display a filterable list showing all extracted contexts with visual indicators for type (color-coded badges) and importance (star ratings). Clicking a context jumps to that timestamp in the recording playback. Teachers can add personal notes to any context for self-reflection. The export function generates a downloadable PDF report summarizing key contexts organized by slide.

Implement basic permissions: superadmin sees all presentations and contexts across the system for training analysis; regular teachers only access their own recordings. Use simple session-based authentication rather than complex role systems.

### Week 11-12: Teaching Intention Analysis System

**Feature Purpose**

This system analyzes how teachers communicate different types of information throughout their presentation. By classifying speech segments into intention categories (explaining, emphasizing, comparing, warning, concluding), teachers gain insight into their teaching style and can identify whether their delivery matches their pedagogical goals.

**Intention Categories**

The system recognizes six fundamental teaching intentions suitable for undergraduate implementation:

**Explanation** - Detailed elaboration of concepts using logical flow, typically longer segments with structured language and frequent use of connecting words like "because", "therefore", "in other words". These form the bulk of most lectures.

**Emphasis** - Highlighting critical information using repetition, intensifiers, or explicit importance markers. Usually shorter segments with strong linguistic signals like "remember this", "most important", "key point".

**Example** - Providing concrete instances or demonstrations to illustrate abstract concepts. Contains phrases introducing examples, references to real situations, or specific cases. Often includes numbers, names, or specific scenarios.

**Comparison** - Contrasting different concepts, approaches, or situations to clarify distinctions. Uses comparative language like "unlike", "whereas", "on the other hand", "the difference is". Helps students understand relationships between ideas.

**Warning** - Alerting students to common mistakes, pitfalls, or important caveats. Contains cautionary language, negative examples, or error discussions. These segments prevent misconceptions.

**Summary** - Consolidating information and providing overviews or conclusions. Appears at section ends or slide transitions with language like "to recap", "in conclusion", "the main points are". Reinforces learning.

**Classification Methodology**

Use a rule-based classification approach combining multiple signals to determine intention. This avoids complex machine learning while achieving reasonable accuracy for teaching contexts.

Create a **Japanese Teaching Phrases Dictionary** containing linguistic markers for each intention category. For example, Emphasis includes phrases like "大切", "重要な", "忘れないで", "必ず覚えて". Example includes "例えば", "実例として", "ケース", "具体的に". Comparison includes "一方", "対して", "違い", "比較すると". Maintain this dictionary in a simple JSON file that teachers can customize based on their teaching domain.

Implement a **Multi-Factor Scoring System** where each segment receives scores for all six categories. Factor 1: Phrase matching counts how many category-specific phrases appear in the segment. Factor 2: Structural position considers where the segment appears (summaries typically near slide end, examples in middle sections). Factor 3: Length patterns recognize that explanations are usually longer while emphasis is shorter. Factor 4: Keyword density relates high topic keyword density to explanations. Factor 5: Repetition detection identifies emphasis through repeated words or phrases. The system assigns the category with highest combined score, or "Mixed" if no clear winner emerges.

Handle ambiguous cases by allowing multiple tags when scores are close (within twenty percent). This reflects reality where teachers often combine intentions, like explaining while emphasizing.

**Analysis Output and Visualization**

Generate intention distribution statistics showing percentage of time spent on each intention category across the entire presentation. Create a timeline view showing intention flow throughout the lecture, highlighting dominant patterns. Compare intention distribution across different slides revealing whether some slides receive more explanation or emphasis.

Produce a session report containing overall statistics (total time per intention), slide-by-slide breakdown showing intention mix for each slide, highlighted moments where intention shifts indicate teaching strategy changes, and suggestions noting if certain slides lack sufficient explanation or emphasis.

**Comparative Analysis Feature**

For teachers with multiple recorded sessions, implement simple comparison functionality. Track intention distribution changes across sessions showing whether teaching style evolves. Identify slides where intention patterns differ significantly between sessions indicating experimentation or improvement. Calculate consistency metrics showing whether the teacher maintains similar patterns across similar material.

Store comparative data in `presentations/{id}/analysis/intentions.json` with schema including segment_id, timestamp, slide_page, intention_category, confidence_score, key_phrases array, and linked_segments for multi-turn explanations.

**User Interface for Intention Analysis**

Create an "Intention Analysis" dashboard showing the timeline view with color-coded intention segments along a horizontal timeline matching recording duration. Display distribution charts using simple bar or pie charts showing time allocation across intentions. Provide a filterable segment list allowing teachers to see all segments of a specific intention type. Enable playback integration where clicking any segment plays that portion of the recording.

For the comparison view, show side-by-side statistics when teacher selects multiple sessions with shared slides. Highlight differences in intention patterns using simple percentage comparisons. Avoid complex statistical analysis beyond basic percentages and counts to keep implementation manageable.

### Integration with Existing System

**Database Schema Extensions**

Add new tables to existing database to support analytics features without disrupting core transcription functionality.

The `context_extractions` table stores context_id, presentation_id, start_time, end_time, slide_page, context_type, importance_score, extracted_text, keywords array, teacher_notes, created_at. Index on presentation_id and context_type for efficient filtering.

The `intention_segments` table stores segment_id, presentation_id, start_time, end_time, slide_page, intention_category, confidence_score, key_phrases array, segment_text, created_at. Index on presentation_id and intention_category.

The `analysis_versions` table tracks analysis_id, presentation_id, analysis_type ("context" or "intention"), version_number, generated_at, parameters_used for reproducibility.

Use foreign keys to maintain referential integrity with the existing presentations table. Keep analytics data separate from real-time transcription data to avoid impacting streaming performance.

**Processing Pipeline**

Trigger analytics processing automatically after recording session completes and transcript is finalized. Add the analytics job to a background queue (using simple Python queue or Redis) to avoid blocking user interface. Show progress indicators in the UI as "Analyzing context..." and "Classifying teaching intentions..." during processing.

The processing sequence follows: wait for transcript finalization, load all session data including transcript segments, matches, and slide data, run context extraction passing segments and matches through the scoring and classification pipeline (estimated two to three minutes for one-hour lecture), run intention analysis passing segments through phrase matching and scoring (estimated one to two minutes), save results to database and GCS, and notify frontend that analysis is complete.

Handle failures gracefully by retrying once before marking analysis as failed. Allow teachers to manually trigger re-analysis if needed with updated parameters. Store analysis parameters (thresholds, category definitions) with results for transparency.

**Export and Reporting Features**

Implement comprehensive export functionality accessible through a "Download Analysis" button on the presentation page. Teachers can choose from multiple export formats based on their needs.

The PDF Report generates a formatted document containing presentation overview (title, date, duration, slides count), context extraction summary with top contexts by importance organized by slide, intention analysis summary with distribution charts and timeline, notable patterns highlighting interesting findings like emphasis clusters or explanation gaps, and improvement suggestions based on analysis results. Use a Python library like ReportLab or WeasyPrint for PDF generation, keeping templates simple and professional.

The Excel Workbook provides structured data in tabular format across multiple sheets: contexts sheet with all context extractions, intentions sheet with all intention segments, summary sheet with aggregate statistics, and timeline sheet with chronological view. Use openpyxl library for Excel generation since many teachers prefer spreadsheet analysis.

The JSON Bundle offers raw data export for teachers who want programmatic access or custom analysis. Include all contexts, intentions, statistics, and metadata in a single downloadable file with clear schema documentation.

For superadmin users, provide aggregate export functionality allowing analysis across multiple presentations to identify teaching patterns at the department or institutional level. Keep this simple with CSV exports showing statistics per presentation without attempting complex learning analytics.

**Permission and Access Control**

Implement straightforward role-based access aligned with typical educational settings.

Teacher Role gets full access to their own presentations including uploading slides, recording sessions, viewing transcripts and matches, accessing context and intention analysis, exporting reports, adding personal notes to contexts, and deleting their own presentations. Teachers cannot see other teachers' data ensuring privacy.

Superadmin Role gets all teacher permissions plus access to all presentations across the system, ability to view aggregate analytics, export bulk data for training purposes, configure system-wide parameters (phrase dictionaries, scoring thresholds), and manage user accounts. Use this role sparingly, typically for educational technology specialists or department heads.

Basic Implementation: use session-based authentication with roles stored in user table. Check permissions at API endpoints using simple decorators. For a student project, avoid complex permission systems like RBAC frameworks and instead use straightforward if-statements checking user role.

### Phase 5 Deliverables

At completion of Phase 5, the system provides comprehensive teaching analytics alongside core transcription functionality.

**Context Extraction System** delivers automated identification of important teaching moments with type classification (explanation, emphasis, example, summary, question), importance scoring helping teachers prioritize review, slide-by-slide organization showing content distribution, and teacher annotation capability for personal notes and reflection.

**Intention Analysis System** provides six-category intention classification (explain, emphasize, compare, warn, summarize, example), intention distribution statistics showing teaching style profile, timeline visualization revealing intention flow patterns, and comparative analysis tracking evolution across multiple sessions.

**Export and Reporting** offers PDF reports formatted for teacher review and self-assessment, Excel workbooks enabling custom analysis, JSON bundles for programmatic access, and superadmin aggregate exports supporting institutional insights.

**User Interface Components** include analytics dashboard showing both context and intention results, filterable segment lists for detailed review, integrated playback linking analysis to recording, comparison view for multi-session analysis, and simple role-based access ensuring data privacy.

### Success Metrics and Validation

Validate Phase 5 implementation through practical testing with real teaching scenarios.

For context extraction, measure accuracy by having teachers review extracted contexts and mark whether they agree each is truly important (target seventy-five percent agreement), verify all context types are correctly classified (target seventy percent accuracy), and confirm processing completes within five minutes for typical one-hour lecture.

For intention analysis, validate that intention categories are consistently applied by having multiple reviewers classify sample segments and measuring inter-rater agreement (target sixty-five percent agreement given subjective nature), verify intention distribution appears reasonable for typical lectures (majority explanation and example with smaller portions of emphasis and summary), and confirm teachers find the analysis useful by collecting feedback through simple questionnaire.

For overall system, ensure analytics processing does not interfere with core recording functionality, verify exported reports are readable and useful for teachers, and confirm permission controls properly restrict access to appropriate data.

---

## IMPLEMENTATION NOTES FOR STUDENT PROJECT

### Scope Management

This updated plan maintains feasibility for undergraduate implementation while adding meaningful educational value. The following considerations ensure successful completion:

**Prioritize Core Over Polish**: Focus first on getting context extraction and intention analysis working with basic accuracy. Pretty visualizations and advanced export formats can be added later if time permits. A working prototype with seventy percent accuracy is more valuable than a half-finished perfect system.

**Use Existing Libraries**: Leverage established tools rather than building from scratch. For Japanese text processing, use MeCab (standard morphological analyzer). For PDF generation, use ReportLab or WeasyPrint. For Excel export, use openpyxl. For web framework, continue with Flask or FastAPI from earlier phases. Don't reinvent wheels.

**Rule-Based Over ML**: This plan deliberately uses rule-based classification rather than machine learning to keep complexity manageable. Creating a phrase dictionary and implementing scoring rules is achievable in a few weeks. Training accurate ML models would require extensive labeled data and expertise beyond typical undergraduate scope.

**Simplify Data Storage**: Use PostgreSQL or MySQL for structured data (contexts, intentions, users) as planned in original phases. Continue using Google Cloud Storage for files. Avoid introducing additional databases or caching layers unless absolutely necessary. Simple is reliable.

**Test with Real Data**: Record several sample lectures in Japanese (can be recorded by team members presenting on any topic) to test the system realistically. Use these recordings to tune phrase dictionaries and scoring thresholds. Real testing reveals edge cases that synthetic data misses.

**Incremental Development**: Build context extraction completely before starting intention analysis. Within each feature, implement basic version first (simple phrase matching) then enhance (add scoring factors) iteratively. This approach produces working prototypes early and allows falling back if time runs short.

**Documentation Over Complexity**: When choosing between a sophisticated algorithm and a simple approach with good documentation, choose simplicity. Well-documented rule-based classification that teachers understand and can customize is more valuable than a black-box ML model with slightly higher accuracy.

### Estimated Effort

For a team of two to three students working part-time:

- Week 9: Context extraction core logic and database (twenty to twenty-five hours)
- Week 10: Context extraction UI and export (fifteen to twenty hours)
- Week 11: Intention analysis core logic and phrase dictionary (twenty to twenty-five hours)
- Week 12: Intention analysis UI, comparison features, and testing (twenty hours)

Total estimated effort: seventy-five to ninety hours across four weeks, which is reasonable for final year project work. Build in buffer time for debugging and iteration.

---

## CONCLUSION

This updated plan transforms the original real-time transcription system into a comprehensive teaching analytics platform while maintaining undergraduate feasibility. The additions provide genuine educational value helping teachers understand and improve their presentation delivery.

The context extraction system identifies important teaching moments automatically, saving teachers hours of manual review. The intention analysis system reveals teaching patterns that teachers may not consciously recognize, enabling reflection and improvement.

Both features use practical rule-based approaches achievable without advanced machine learning knowledge. The implementation leverages existing tools and libraries, focusing student effort on educational domain logic rather than technical infrastructure.

With careful scope management and incremental development, these features are attainable within a four-week extension to the original eight-week plan, resulting in a twelve-week complete implementation delivering a genuinely useful educational technology tool.
