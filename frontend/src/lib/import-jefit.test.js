// The Jefit export reader and what it hands the merge. The fixture is made up but has the
// structure and quirks of a real export: per-block header rows, quoted names with commas, a
// trailing comma in logs, bodyweight sets, a cardio-style row, an exercise renamed over time, a
// log whose session is missing, a custom exercise, and a note in Greek.
import { describe, expect, it } from 'vitest'
import { isJefitExport, parseJefitExport, parseJefitLogs, mergeJefitRoutines } from './import-jefit.js'
import { mergeImport } from './import-csv.js'
import { EXIDX } from './exercises.js'

const FIXTURE = `
### SETTING ##########################################

row_id,USERID,TIMESTAMP,gender,currentRoutine,name,length,mass,timer
1,42,"2026-09-14 17:51:44",M,7,," cm"," kg",90

######################################################

### PROFILE ##########################################

row_id,USERID,TIMESTAMP,_id,mydate,weight,fatpercent,chest,arms,waist,calves,height,hips,thighs,shoulders,neck,forearms,logTime
1,42,"2026-09-03 17:30:46",1,2024-01-10,80,15,100,38,0,0,180,0,0,0,0,0,1704880000
2,42,"2026-09-03 17:30:46",2,2024-03-10,78.5,0,0,0,0,0,180,0,0,0,0,0,1710070000
3,42,"2026-09-03 17:30:46",3,2024-04-10,0,0,0,0,0,0,180,0,0,0,0,0,1712750000

######################################################

### ROUTINES #########################################

row_id,USERID,TIMESTAMP,_id,name,difficulty,focus,dayaweek,description,daytype,tags,rdb_id,bannerCode,progression_flag
1,42,"2026-09-03 17:30:46",7,"Upper, Lower ",1,1,4,"Four days, heavy",0," ",0,,0

row_id,USERID,TIMESTAMP,package,_id,name,day,dayIndex,interval_mode,rest_day,week,sort_order,day_completed_timestamp
2,42,"2026-09-01 18:11:47",7,71,Lower,2,1,0,0,0,1,

row_id,USERID,TIMESTAMP,package,_id,name,day,dayIndex,interval_mode,rest_day,week,sort_order,day_completed_timestamp
3,42,"2026-09-01 18:11:47",7,70,Upper,1,0,0,0,0,0,

row_id,USERID,TIMESTAMP,belongSys,superset,_id,exercise_id,belongplan,exercisename,setcount,timer,logs,bodypart,mysort,targetrep,setdone,setdonetime,interval_time,interval_unit,rest_time_enabled,interval_time_enabled,is_tier_primary
4,42,"2026-09-11 17:29:55",1,0,1,12,71,"Barbell Squat",4,180,"105x4,105x4",8,0,"5,5,5,5",0,0,0,0,1,0,0

row_id,USERID,TIMESTAMP,belongSys,superset,_id,exercise_id,belongplan,exercisename,setcount,timer,logs,bodypart,mysort,targetrep,setdone,setdonetime,interval_time,interval_unit,rest_time_enabled,interval_time_enabled,is_tier_primary
5,42,"2026-09-11 17:29:55",1,0,2,3,70,"Barbell Bench Press",3,120,"",3,0,"12,10,8",0,0,0,0,1,0,0

row_id,USERID,TIMESTAMP,belongSys,superset,_id,exercise_id,belongplan,exercisename,setcount,timer,logs,bodypart,mysort,targetrep,setdone,setdonetime,interval_time,interval_unit,rest_time_enabled,interval_time_enabled,is_tier_primary
6,42,"2026-09-11 17:29:55",0,0,3,1,70,"Pendlay Row",3,90,"",1,1,"8,8,8",0,0,0,0,1,0,0

######################################################

### WORKOUT SESSIONS #################################

rowid,_id,USERID,edit_time,day_id,total_time,workout_time,rest_time,wasted_time,total_exercise,total_weight,recordbreak,starttime,endtime,workout_mode,TIMESTAMP,calories,avg_heart_rate
1,10,42,0,70,3600,0,0,0,2,0,0,1704906000,1704909600,0,"2026-04-25 09:18:05",0,0
2,11,42,0,71,3000,0,0,0,2,0,0,1705078800,1705081800,0,"2026-04-25 09:18:05",0,0
3,12,42,0,70,0,0,0,0,0,0,0,1705251600,1705251600,0,"2026-04-25 09:18:05",0,0

######################################################

### EXERCISE LOGS ####################################

USERID,TIMESTAMP,belongSys,logs,_id,record,mydate,eid,ename,day_item_id,belongsession,logTime,interval_logs,auto_generated
42,"2026-09-03 17:30:46",1,"60x10,60x10,60x8,",1,80,2024-01-10,3,"Bench Press",0,10,1704906000,,No
42,"2026-09-03 17:30:46",0,40x8,2,50,2024-01-10,1,"Pendlay Row",0,10,1704906000,,No
42,"2026-09-03 17:30:46",1,"100x5,100x5,100x5",3,116,2024-01-12,12,"Barbell Squat",0,11,1705078800,,No
42,"2026-09-03 17:30:46",1,"0x12,0x10",4,0,2024-01-12,61,"Hanging Leg Raise",0,11,1705078800,,No
42,"2026-09-03 17:30:46",1,"0x0.0,0x10",5,0,2024-01-12,500,"Treadmill",0,11,1705078800,,No
42,"2026-09-03 17:30:46",1,"62.5x10,62.5x9",6,83,2024-01-20,3,"Barbell Bench Press",0,99,1705748400,,No
42,"2026-09-03 17:30:46",1,"",7,0,2024-01-22,3,"",0,12,1705251600,,No

######################################################

### EXERCISE SET LOGS ################################

_id,userid,exercise_log_id,set_index,weight_lbs,reps,calories,distance_mi,speed_mph,laps,duration,set_type,log_time,TIMESTAMP
1,42,6,0,137.79,10,,,,,,default,1705748400,"2026-09-03 17:30:47"

######################################################

### CUSTOM EXERCISES #################################

row_id,USERID,TIMESTAMP,rating,name,description,image2,image1,bodypart,bodypart3,bodypart2,_id,equip1,equip2,recordtype,link,hashcode,unilateral,sys_exercise_map_id
1,42,"2026-09-03 17:30:46",0,"Pendlay Row",,0,0,1,11,11,1,0,0,0,,,0,

######################################################

### NOTES ############################################

row_id,TIMESTAMP,USERID,_id,eid,belongSys,mynote,title,mydate,logTime,label,bodypart,is_recovered,type
1,"2026-09-03 17:30:46",42,1,12,1,"στη μπάρα, χαμηλά","Barbell Squat",2024-01-12,1705078800,1705078800,-1,0,0

######################################################
`

const freshState = () => ({ workouts: [], bodyweight: [], routines: [], customEx: [], exWeights: {} })

describe('isJefitExport', () => {
  it('knows a Jefit export from a CSV', () => {
    expect(isJefitExport(FIXTURE)).toBe(true)
    expect(isJefitExport('Date,Exercise,Weight,Reps\n2024-01-01,Squat,100,5')).toBe(false)
  })
})

describe('parseJefitLogs', () => {
  it('reads weight x reps, ignoring a trailing comma', () => {
    expect(parseJefitLogs('60x10,60x10,60x8,')).toEqual([{ w: 60, r: 10 }, { w: 60, r: 10 }, { w: 60, r: 8 }])
  })
  it('keeps bodyweight sets and drops cardio-style logs', () => {
    expect(parseJefitLogs('0x12,0x10')).toEqual([{ w: 0, r: 12 }, { w: 0, r: 10 }])
    expect(parseJefitLogs('0x0.0,0x10')).toEqual([])
    expect(parseJefitLogs('')).toEqual([])
  })
})

describe('parseJefitExport', () => {
  const p = parseJefitExport(FIXTURE, { unit: 'kg' })

  it('makes one workout per session, plus one for a log whose session is missing', () => {
    const w = p.workouts.workouts
    expect(w).toHaveLength(3)
    expect(w.map(x => x.d)).toEqual([...w.map(x => x.d)].sort())
    expect(w[0].name).toBe('Upper, Lower · Upper')
    expect(w[1].name).toBe('Upper, Lower · Lower')
    // Session 99 is not in WORKOUT SESSIONS: filed under its own date.
    expect(w[2].d).toBe('2024-01-20')
    expect(w[2].name).toBe('Imported')
  })

  it('reads every set, keeps bodyweight ones, and skips the cardio and empty logs', () => {
    expect(p.workouts.sets).toBe(3 + 1 + 3 + 2 + 2)
    expect(p.workouts.skipped).toBe(2)
    const legRaise = p.workouts.workouts[1].entries.find(e => e.sets.every(s => s.w === 0))
    expect(legRaise.sets.map(s => s.r)).toEqual([12, 10])
  })

  it('keeps a renamed exercise as one, under its newest name', () => {
    const benchIds = new Set([p.workouts.workouts[0], p.workouts.workouts[2]]
      .map(w => w.entries.find(e => e.sets.some(s => s.w === 60 || s.w === 62.5)).id))
    expect(benchIds.size).toBe(1)
  })

  it('creates custom exercises with a real body part and stable ids', () => {
    const again = parseJefitExport(FIXTURE, { unit: 'kg' })
    expect(again.workouts.customEx.map(c => c.id)).toEqual(p.workouts.customEx.map(c => c.id))
    for (const c of p.workouts.customEx) {
      expect(c.custom).toBe(true)
      expect(typeof c.bp).toBe('string')
    }
    const ids = p.workouts.workouts.flatMap(w => w.entries.map(e => e.id))
    for (const id of ids) expect(!!EXIDX[id] || p.workouts.customEx.some(c => c.id === id)).toBe(true)
    expect(p.workouts.workouts.map(w => w.id)).toEqual(again.workouts.workouts.map(w => w.id))
  })

  it('an exercise the library does not know becomes one custom, with its Jefit body part', () => {
    const odd = parseJefitExport(FIXTURE.replaceAll('Pendlay Row', 'Zorb Twirl'), { unit: 'kg' })
    expect(odd.workouts.unmatchedNames).toEqual(['zorb twirl'])
    expect(odd.workouts.customEx).toHaveLength(1)
    expect(odd.workouts.customEx[0]).toMatchObject({ n: 'zorb twirl', bp: 'back', custom: true })
    // The routine points at the same custom the workouts do.
    expect(odd.routines.routines[0].ex[1].id).toBe(odd.workouts.customEx[0].id)
  })

  it('attaches a note to the exercise on the day it was written', () => {
    const lower = p.workouts.workouts[1]
    expect(lower.entries.some(e => e.note === 'στη μπάρα, χαμηλά')).toBe(true)
  })

  it('converts kg to a lb profile', () => {
    const lb = parseJefitExport(FIXTURE, { unit: 'lb' })
    expect(lb.workouts.converted).toBe(true)
    expect(lb.workouts.workouts[1].entries[0].sets[0].w).toBe(220.5)
    expect(lb.bodyweight.bodyweight[0].w).toBe(176.4)
  })

  it('reads lb exports into a kg profile', () => {
    const lbFile = FIXTURE.replace('," kg",', '," lb",')
    const kg = parseJefitExport(lbFile, { unit: 'kg' })
    expect(kg.workouts.fileUnit).toBe('lb')
    expect(kg.workouts.workouts[1].entries[0].sets[0].w).toBe(45.4)
  })

  it('makes one routine per Jefit day, with sets, rest and a pyramid where the targets differ', () => {
    const r = p.routines.routines
    expect(r.map(x => x.name)).toEqual(['Upper, Lower · Upper', 'Upper, Lower · Lower'])
    const [bench, row] = r[0].ex
    expect(bench).toMatchObject({ sets: 3, reps: 12, pyramid: [12, 10, 8], restSec: 120, mode: 'reps' })
    expect(row).toMatchObject({ sets: 3, reps: 8, restSec: 90 })
    expect(row.pyramid).toBeUndefined()
    expect(r[1].ex[0]).toMatchObject({ sets: 4, reps: 5, weight: 105, restSec: 180 })
  })

  it('reads weigh-ins and leaves out the unrecorded ones', () => {
    expect(p.bodyweight.bodyweight.map(b => [b.d, b.w])).toEqual([['2024-01-10', 80], ['2024-03-10', 78.5]])
  })

  it('says when a file is not a Jefit export', () => {
    expect(parseJefitExport('### SOMETHING ###\na,b\n1,2\n').error).toBe('unrecognised')
  })
})

describe('merging', () => {
  it('importing the same export twice adds nothing the second time', () => {
    const S = freshState()
    const first = parseJefitExport(FIXTURE, { unit: 'kg' })
    expect(mergeImport(S, first.workouts).added).toBe(3)
    expect(mergeJefitRoutines(S, first.routines, first.workouts)).toMatchObject({ added: 2, updated: 0 })
    expect(mergeImport(S, first.bodyweight).added).toBe(2)
    const customs = S.customEx.length

    const second = parseJefitExport(FIXTURE, { unit: 'kg', customEx: S.customEx })
    expect(mergeImport(S, second.workouts).added).toBe(0)
    expect(mergeJefitRoutines(S, second.routines, second.workouts)).toMatchObject({ added: 0, updated: 2, linked: 0 })
    expect(mergeImport(S, second.bodyweight).added).toBe(0)
    expect(S.workouts).toHaveLength(3)
    expect(S.routines).toHaveLength(2)
    expect(S.customEx).toHaveLength(customs)
  })

  it('routine exercises point at exercises that exist after the merge', () => {
    const S = freshState()
    const p = parseJefitExport(FIXTURE, { unit: 'kg' })
    mergeJefitRoutines(S, p.routines)
    for (const r of S.routines) for (const e of r.ex) expect(!!EXIDX[e.id] || S.customEx.some(c => c.id === e.id)).toBe(true)
  })
})

describe('programs and their days', () => {
  const TODAY = '2026-10-24', NOW = new Date('2026-10-24T09:00:00').getTime()

  it('files each workout under the routine of the Jefit day it was trained on', () => {
    const S = freshState()
    const p = parseJefitExport(FIXTURE, { unit: 'kg' })
    mergeImport(S, p.workouts)
    const res = mergeJefitRoutines(S, p.routines, p.workouts, TODAY, NOW)
    expect(res.linked).toBe(0)   // already carried their routine from the parse
    const upper = S.routines.find(r => r.name.endsWith('Upper'))
    const lower = S.routines.find(r => r.name.endsWith('Lower'))
    const [w1, w2, w3] = S.workouts
    expect(w1).toMatchObject({ routineId: upper.id, routineIds: [upper.id] })
    expect(w2).toMatchObject({ routineId: lower.id, routineIds: [lower.id] })
    // No session in the file, so no day to file it under.
    expect(w3.routineId).toBeNull()
  })

  it('makes the program Jefit had selected the rotation, its days in order, when there is no schedule', () => {
    const S = freshState()
    const p = parseJefitExport(FIXTURE, { unit: 'kg' })
    const res = mergeJefitRoutines(S, p.routines, p.workouts, TODAY, NOW)
    expect(res.scheduled).toBe('Upper, Lower')
    const names = S.rotation.sequence.map(id => S.routines.find(r => r.id === id).name)
    expect(names).toEqual(['Upper, Lower · Upper', 'Upper, Lower · Lower'])
    expect(S.queue).toMatchObject({ ids: S.rotation.sequence, label: 'Upper, Lower', rotationId: S.rotation.id })
    expect(S.scheduleMode).toBe('rotation')
  })

  it('leaves a schedule the user already has alone', () => {
    const S = { ...freshState(), routines: [{ id: 'mine', name: 'Mine', ex: [] }], week: { mon: ['mine'] } }
    const p = parseJefitExport(FIXTURE, { unit: 'kg' })
    expect(mergeJefitRoutines(S, p.routines, p.workouts, TODAY, NOW).scheduled).toBeNull()
    expect(S.rotation).toBeUndefined()
    expect(S.queue).toBeFalsy()
  })

  it('links the workouts of an earlier import that had no routines yet', () => {
    const S = freshState()
    const p = parseJefitExport(FIXTURE, { unit: 'kg' })
    // What the first version of the import stored: the same workouts, under no routine.
    mergeImport(S, { ...p.workouts, workouts: p.workouts.workouts.map(w => { const { routineIds, ...rest } = w; return { ...rest, routineId: null } }) })
    const again = parseJefitExport(FIXTURE, { unit: 'kg', customEx: S.customEx })
    expect(mergeImport(S, again.workouts).added).toBe(0)
    expect(mergeJefitRoutines(S, again.routines, again.workouts, TODAY, NOW).linked).toBe(2)
    expect(S.workouts.filter(w => w.routineId).map(w => S.routines.find(r => r.id === w.routineId).name))
      .toEqual(['Upper, Lower · Upper', 'Upper, Lower · Lower'])
  })

  it('points the history at routines an earlier import made under other ids', () => {
    const S = freshState()
    const p = parseJefitExport(FIXTURE, { unit: 'kg' })
    mergeImport(S, p.workouts)
    // Routines from the first version of the import: random ids, matched again by their Jefit day.
    p.routines.routines.forEach((r, i) => S.routines.push({ ...r, id: 'old' + i }))
    mergeJefitRoutines(S, p.routines, p.workouts, TODAY, NOW)
    expect(S.routines.map(r => r.id)).toEqual(['old0', 'old1'])
    expect(S.workouts.slice(0, 2).map(w => w.routineId)).toEqual(['old0', 'old1'])
  })

  it('never re-files a workout the user moved to another routine', () => {
    const S = freshState()
    const p = parseJefitExport(FIXTURE, { unit: 'kg' })
    mergeImport(S, p.workouts)
    S.workouts[0].routineId = 'elsewhere'; S.workouts[0].routineIds = ['elsewhere']
    mergeJefitRoutines(S, p.routines, p.workouts, TODAY, NOW)
    expect(S.workouts[0].routineId).toBe('elsewhere')
  })
})
