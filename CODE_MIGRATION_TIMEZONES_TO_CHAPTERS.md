# Code Migration Guide: Timezones → Chapters

After running the SQL migration, you'll need to update the codebase. Here's the systematic approach:

## 1. API Routes (Priority: HIGH)

### Files to Update:
- `app/api/timezones/route.ts` → `app/api/chapters/route.ts`
- `app/api/timezones/[id]/route.ts` → `app/api/chapters/[id]/route.ts`

### Changes Needed:
```typescript
// OLD
.from('timezones')
.select('id, title, description, start_date, end_date, location')

// NEW  
.from('chapters')
.select('id, title, description, start_date, end_date, location')
```

## 2. Database Queries (Priority: HIGH)

### Files to Update (30+ files):
- `app/api/vapi/webhook/route.ts`
- `components/TimelineView.tsx`
- `components/GroupManager.tsx`
- `components/ChronologicalTimelineView.tsx`
- All other files from grep results

### Search & Replace Patterns:
```bash
# Table names
timezones → chapters
timezone_members → chapter_members

# Column names  
timezone_id → chapter_id
timeZoneId → chapterId (camelCase)

# API endpoints
/api/timezones → /api/chapters
```

## 3. TypeScript Types (Priority: HIGH)

### File: `lib/types.ts`
```typescript
// OLD
export interface TimeZone {
  timeZoneId: string
  // ...
}

// NEW
export interface Chapter {
  chapterId: string  
  // ...
}

// Update all related types:
TimeZoneWithRelations → ChapterWithRelations
TimeZoneMember → ChapterMember
MemoryWithRelations.timeZone → MemoryWithRelations.chapter
```

## 4. React Components (Priority: MEDIUM)

### Variable Renaming:
```typescript
// OLD
const [timeZones, setTimeZones] = useState([])
const [selectedTimeZone, setSelectedTimeZone] = useState(null)

// NEW
const [chapters, setChapters] = useState([])
const [selectedChapter, setSelectedChapter] = useState(null)
```

## 5. Component File Renames (Priority: LOW)

Consider renaming for clarity:
- `CreateTimeZone.tsx` → `CreateChapter.tsx`
- `TimeZoneCard.tsx` → `ChapterCard.tsx`  
- `TimeZoneList.tsx` → `ChapterList.tsx`

## 6. Prisma Schema (If Used)

### File: `prisma/schema.prisma`
```prisma
// OLD
model TimeZone {
  @@map("timezones")
}

// NEW
model Chapter {
  @@map("chapters")
}
```

## 7. VAPI Integration Updates

### File: `app/api/vapi/webhook/route.ts`
```typescript
// Update all references:
.from('timezones') → .from('chapters')
timezone_id → chapter_id
chapterTimeZoneId → chapterChapterId (or just chapterId)
```

## Migration Strategy

### Phase 1: Database Migration
1. ✅ Run the SQL migration script
2. ✅ Verify data copied correctly
3. ✅ Test that views work for backward compatibility

### Phase 2: Critical Code Updates  
1. Update API routes (`/api/timezones/` → `/api/chapters/`)
2. Update all database queries (`timezones` → `chapters`)
3. Update column references (`timezone_id` → `chapter_id`)
4. Update TypeScript types

### Phase 3: Component Updates
1. Update React components and state variables
2. Update prop names and interfaces
3. Test all functionality

### Phase 4: Cleanup
1. Remove backward compatibility views
2. Drop old tables
3. Remove old columns
4. Update documentation

## Testing Checklist

- [ ] Chapter creation works
- [ ] Memory allocation to chapters works  
- [ ] Chapter editing works
- [ ] Chapter deletion works
- [ ] Maya can save memories to chapters
- [ ] Timeline views show chapters correctly
- [ ] All API endpoints respond correctly

## Estimated Effort

- **Database Migration**: 30 minutes
- **API Updates**: 2-3 hours
- **Component Updates**: 3-4 hours  
- **Testing & Debugging**: 2-3 hours
- **Total**: 1 full day

## Risk Assessment

**Low Risk** - The migration creates new tables alongside old ones, so you can rollback easily if needed. The views provide backward compatibility during the transition.
