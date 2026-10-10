"""GM-03 synthetic food inputs and hand-authored expectations, not eligibility.

All clocks are explicit. No network, imports of AI/crawl code, SQL or ranking.
"""
from __future__ import annotations

import argparse
from collections import Counter
import copy
import hashlib
import json
from pathlib import Path
from urllib.parse import urlsplit

from base_catalogue import BASE, stable_id
import data_contract as dc

ROOT = BASE.parent
OUTPUT = ROOT / 'tests/fixtures/food-data-v1'
FIXTURE_VERSION = 'food-fixtures-v1'
VALIDATION_AT = '2026-10-08T00:00:00Z'
DAY = '2026-10-10T05:00:00Z'  # Saturday 12:00 Asia/Ho_Chi_Minh
PART3_COMMIT = '2e61a5712a07fe4834e92f907a278cb0740c7174'
GROUPS = {'pool', 'preferences', 'identity', 'price', 'profile', 'meal',
          'overnight', 'schedule', 'geography', 'freshness', 'availability', 'context', 'determinism'}
ASSERTIONS = {
    'pool_limit', 'use_actual_count', 'empty_has_reason', 'category_is_soft',
    'category_representation', 'multilabel_not_duplicate', 'alias_same_identity',
    'preserve_variants', 'unknown_price_not_zero', 'budget_is_soft',
    'group_price_not_per_person', 'unknown_traits_preserved', 'no_cross_offering_profile',
    'unknown_meal_not_assumed', 'opening_inclusive', 'closing_exclusive',
    'overnight_carry', 'venue_offering_intersection', 'split_shift_gap',
    'closed_exception_blocks_carry', 'no_coverage_expansion', 'no_radius_expansion',
    'origin_not_location', 'source_freshness', 'source_expiry_exclusive',
    'dataset_does_not_extend_child', 'unknown_menu_requires_confirmation',
    'unknown_schedule_requires_confirmation', 'active_stock_override_excludes',
    'expired_stock_override_unknown', 'schedule_not_live_stock',
    'scheduled_no_second_buffer', 'now_buffer_once', 'past_time_requires_confirmation',
    'same_seed_same_pool', 'source_order_invariant',
}
SPECS = ['docs/specs/FOOD_DATA_SPEC.md', 'docs/specs/CATALOG_PREFERENCES_SPEC.md',
         'docs/specs/CONTEXT_HISTORY_SPEC.md']
DISH_DEFINITIONS = [
    ('grill-chicken', 'Gà nướng', ['preparation:grilled']),
    ('grill-fish', 'Cá nướng', ['preparation:grilled']),
    ('hotpot-veg', 'Lẩu rau', ['family:hotpot']),
    ('hotpot-mushroom', 'Lẩu nấm', ['family:hotpot']),
    ('hotpot-grill', 'Suất lẩu và nướng', ['family:hotpot', 'preparation:grilled']),
    ('rice', 'Cơm gà', ['family:rice']), ('bun', 'Bún bò', ['family:bun']),
    ('pho', 'Phở bò', ['family:pho']), ('salad', 'Salad', ['family:salad']),
    ('sticky-rice', 'Xôi', ['family:sticky_rice']),
]


def fixture_id(entity, key):
    return stable_id(entity, 'fixture:gm03:food-v1:' + key)


def save_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def hash_file(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def base_dataset():
    bundle = dict(contractVersion='1.0.0', datasetVersion='1.0.0', fixtureOnly=True,
                  entities={entity: [] for entity in dc.ENTITIES})
    data = bundle['entities']
    registry = []

    def row(entity, key, **values):
        fields = dc.ENTITIES[entity]['fields']
        pk = dc.ENTITIES[entity]['primaryKey']
        r = {k: [] if f['type'] in ['stringArray', 'uuidArray', 'intervals'] and not f['nullable']
             else {} if f['type'] == 'object' else None for k, f in fields.items()}
        r.update(version=1, reviewStatus='verified', sourceRef=fixture_id('dataSources', 'main'),
                 fieldSources={}, checkedAt='2026-10-07T00:00:00Z', validUntil='2026-10-20T00:00:00Z',
                 enteredBy='fixture-author-simulated', reviewedBy='fixture-reviewer-simulated')
        r[pk] = fixture_id(entity, key)
        r.update(values)
        data[entity].append(r)
        registry.append(dict(entity=entity, registryKey=key, id=r[pk]))
        return r

    for key in ['main', 'menu', 'hours', 'coordinates']:
        row('dataSources', key, locator=f'https://example.invalid/gm03-fixture/{key}',
            usageRights='granted', license='Synthetic permission for test only; grants no real rights',
            attribution='GM-03 fixture authors (simulated)', status='verified')
    main = fixture_id('dataSources', 'main')
    menu = fixture_id('dataSources', 'menu')
    hours = fixture_id('dataSources', 'hours')
    coordinates = fixture_id('dataSources', 'coordinates')
    categories = sorted({c for _, _, codes in DISH_DEFINITIONS for c in codes})
    row('taxonomy', 'cuisine:vi', type='cuisine', code='vi', label='Việt — mô phỏng',
        description='Nhãn fixture, không phải dữ liệu món được xác minh', status='verified')
    for code in categories:
        row('taxonomy', code, type='category', code=code, label=code + ' — mô phỏng',
            description='Giá trị controlled taxonomy dùng trong fixture', status='verified')
    for key, name, codes in DISH_DEFINITIONS:
        row('dishes', key, name=name + ' — mô phỏng', description='Món giả lập để kiểm thử; không tìm quán thật',
            aliases=['Thịt gà nướng — mô phỏng'] if key == 'grill-chicken' else [],
            cuisineIds=[fixture_id('taxonomy', 'cuisine:vi')], categoryIds=[fixture_id('taxonomy', c) for c in codes],
            mealSlots=['lunch', 'dinner'], timeHints=[], classificationStatus='reviewed', origin='unknown',
            ingredientTags=None, temperature='unknown', flavor=None, artwork=None, sourceDishIds=[],
            status='verified', fieldSources={'name': main, 'description': main, 'taxonomy': main})
    for key, lng in [('a', 0.001), ('b', 0.002)]:
        venue = row('venues', key, branchName=f'Quán {key.upper()} — mô phỏng',
            address='Địa chỉ mô phỏng, không dùng tìm quán thật', adminAreaId='fixture-grid',
            lat=0.0, lng=lng, timezone='Asia/Ho_Chi_Minh', status='active', serviceModes=['dine_in'],
            fieldSources={'coordinates': coordinates, 'address': main, 'hours': hours})
        group = fixture_id('scheduleGroups', 'venue-' + key)
        registry.append(dict(entity='scheduleGroups', registryKey='venue-' + key, id=group))
        for day in [5, 6]:
            row('weeklySchedules', f'venue-{key}-{day}', scheduleId=group, ownerType='venue', ownerId=venue['id'],
                dayOfWeek=day, startTime='00:00', endTime='00:00', endDayOffset=1, is24Hours=True,
                timezone='Asia/Ho_Chi_Minh', status='open', sourceRef=hours, fieldSources={'hours': hours})
    for index, (key, name, _) in enumerate(DISH_DEFINITIONS):
        group = fixture_id('scheduleGroups', 'offering-' + key)
        registry.append(dict(entity='scheduleGroups', registryKey='offering-' + key, id=group))
        offer = row('venueDishes', key, venueId=fixture_id('venues', 'a' if index % 2 == 0 else 'b'),
            dishId=fixture_id('dishes', key), variant=None, menuName=name + ' — menu mô phỏng',
            menuSource=menu, scheduleId=group, serviceMode='dine_in', priceMin=30000 + index * 1000,
            priceMax=30000 + index * 1000, unit='person', currency='VND', servingSize=None,
            profileOverrides=None, artwork=None, status='verified', sourceRef=menu,
            fieldSources={'menu': menu, 'price': menu, 'hours': hours})
        for day in [5, 6]:
            row('weeklySchedules', f'offering-{key}-{day}', scheduleId=group, ownerType='offering', ownerId=offer['offeringId'],
                dayOfWeek=day, startTime='10:00', endTime='23:00', endDayOffset=0, is24Hours=False,
                timezone='Asia/Ho_Chi_Minh', status='open', sourceRef=hours, fieldSources={'hours': hours})
    row('coverageAreas', 'area', name='Ô lưới giả lập — mô phỏng, không phải coverage thật',
        boundary={'type': 'Polygon', 'coordinates': [[[-0.02, -0.02], [0.02, -0.02], [0.02, 0.02],
                                                       [-0.02, 0.02], [-0.02, -0.02]]]},
        datasetVersion=bundle['datasetVersion'], sourceRef=coordinates, fieldSources={'coverage': coordinates})
    row('publicAnchors', 'anchor', name='Điểm ăn công cộng — mô phỏng', lat=0.0, lng=0.0,
        coverageId=fixture_id('coverageAreas', 'area'), isPublic=True, sourceRef=coordinates)
    row('datasetVersions', 'version', datasetVersion=bundle['datasetVersion'], contractVersion=bundle['contractVersion'],
        status='verified', artifactLocator='tests/fixtures/food-data-v1/base.json',
        qualityReport='tests/fixtures/food-data-v1/README.md')
    return bundle, registry


def find(bundle, entity, key):
    pk = dc.ENTITIES[entity]['primaryKey']
    return next(r for r in bundle['entities'][entity] if r[pk] == fixture_id(entity, key))


def change(row, **values):
    row.update(values)
    row['version'] += 1


def subset(base, keys):
    result = copy.deepcopy(base)
    keys = set(keys)
    dish_ids = {fixture_id('dishes', key) for key in keys}
    data = result['entities']
    data['dishes'] = [r for r in data['dishes'] if r['id'] in dish_ids]
    data['venueDishes'] = [r for r in data['venueDishes'] if r['dishId'] in dish_ids]
    offer_ids = {r['offeringId'] for r in data['venueDishes']}
    data['weeklySchedules'] = [r for r in data['weeklySchedules'] if r['ownerType'] == 'venue' or r['ownerId'] in offer_ids]
    return result


def add_offer(bundle, key, *, variant=None, profile=None, price=30000):
    original = find(bundle, 'venueDishes', 'grill-chicken')
    extra = copy.deepcopy(original)
    extra.update(offeringId=fixture_id('venueDishes', key), venueId=fixture_id('venues', 'b'),
                 scheduleId=fixture_id('scheduleGroups', key), variant=variant,
                 profileOverrides=profile, priceMin=price, priceMax=price,
                 menuName='Gà nướng phiên bản riêng — menu mô phỏng')
    bundle['entities']['venueDishes'].append(extra)
    for r in list(bundle['entities']['weeklySchedules']):
        if r['ownerType'] == 'offering' and r['ownerId'] == original['offeringId']:
            clone = copy.deepcopy(r)
            clone.update(id=fixture_id('weeklySchedules', key + '-' + str(r['dayOfWeek'])),
                         scheduleId=extra['scheduleId'], ownerId=extra['offeringId'])
            bundle['entities']['weeklySchedules'].append(clone)
    return extra


def build_suite():
    """Expected sets below are authored explicitly, never calculated from schedules."""
    base, registry = base_dataset()
    keys = [r[0] for r in DISH_DEFINITIONS]
    datasets = {'base': base, 'eight': subset(base, keys[:8]), 'three': subset(base, keys[:3]),
                'one': subset(base, ['grill-chicken']), 'multi': subset(base, ['hotpot-grill'])}
    one = datasets['one']
    for name in ['no-offering', 'missing-price', 'over-budget', 'group-price', 'missing-meal',
                 'night', 'venue-closed', 'split-gap', 'outside-area', 'outside-radius',
                 'southern-origin', 'source-expiry', 'unknown-menu', 'unknown-hours',
                 'sold-out', 'paused', 'short-window']:
        datasets[name] = copy.deepcopy(one)
    datasets['no-offering']['entities']['venueDishes'] = []
    datasets['no-offering']['entities']['weeklySchedules'] = [r for r in one['entities']['weeklySchedules'] if r['ownerType'] == 'venue']
    change(find(datasets['missing-price'], 'venueDishes', 'grill-chicken'),
           priceMin=None, priceMax=None, unit=None, currency=None)
    change(find(datasets['over-budget'], 'venueDishes', 'grill-chicken'), priceMin=90000, priceMax=90000)
    change(find(datasets['group-price'], 'venueDishes', 'grill-chicken'), priceMin=240000, priceMax=240000,
           unit='group', servingSize='Suất nhóm mô phỏng, chưa biết số người')
    change(find(datasets['missing-meal'], 'dishes', 'grill-chicken'), mealSlots=[], classificationStatus='needs_review',
           status='draft', reviewStatus='draft', reviewedBy=None, validUntil=None)
    night = datasets['night']
    for r in night['entities']['weeklySchedules']:
        if r['ownerType'] == 'offering':
            if r['dayOfWeek'] == 5:
                change(r, startTime='22:00', endTime='02:00', endDayOffset=1)
            else:
                change(r, startTime=None, endTime=None, endDayOffset=None, is24Hours=False, status='closed')
    datasets['night-closed-next-day'] = copy.deepcopy(night)
    exception = copy.deepcopy(find(night, 'weeklySchedules', 'venue-a-6'))
    for field in list(exception):
        if field not in dc.ENTITIES['dateExceptions']['fields']:
            del exception[field]
    exception.update(id=fixture_id('dateExceptions', 'closed-saturday'), localDate='2026-10-10',
                     status='closed', intervals=[], lastOrder=None)
    datasets['night-closed-next-day']['entities']['dateExceptions'].append(exception)
    for r in datasets['venue-closed']['entities']['weeklySchedules']:
        if r['ownerType'] == 'venue' and r['ownerId'] == fixture_id('venues', 'a'):
            change(r, startTime='14:00', endTime='23:00', endDayOffset=0, is24Hours=False)
    split = datasets['split-gap']
    for r in list(split['entities']['weeklySchedules']):
        if r['ownerType'] == 'offering':
            change(r, startTime='10:00', endTime='11:30')
            second = copy.deepcopy(r)
            second.update(id=fixture_id('weeklySchedules', 'split-' + str(r['dayOfWeek'])), startTime='13:00', endTime='23:00')
            split['entities']['weeklySchedules'].append(second)
    change(find(datasets['outside-area'], 'publicAnchors', 'anchor'), lat=0.03, lng=0.03)
    change(find(datasets['outside-radius'], 'venues', 'a'), lng=0.015)
    change(find(datasets['southern-origin'], 'dishes', 'grill-chicken'), origin='south')
    change(find(datasets['source-expiry'], 'dataSources', 'menu'), validUntil=DAY)
    change(find(datasets['unknown-menu'], 'venueDishes', 'grill-chicken'), menuSource=None,
           reviewStatus='draft', status='draft', reviewedBy=None, validUntil=None)
    for r in datasets['unknown-hours']['entities']['weeklySchedules']:
        if r['ownerType'] == 'offering':
            change(r, status='unknown', startTime=None, endTime=None, endDayOffset=None, is24Hours=False)
    for name, state in [('sold-out', 'sold_out'), ('paused', 'paused')]:
        offer = find(datasets[name], 'venueDishes', 'grill-chicken')
        datasets[name]['entities']['availabilityOverrides'].append(dict(
            id=fixture_id('availabilityOverrides', name), offeringId=offer['offeringId'], state=state,
            source=fixture_id('dataSources', 'menu'), observedAt='2026-10-07T00:00:00Z', expiresAt=DAY,
            version=1, reviewStatus='verified', sourceRef=fixture_id('dataSources', 'menu'), fieldSources={},
            checkedAt='2026-10-07T00:00:00Z', validUntil='2026-10-20T00:00:00Z',
            enteredBy='fixture-author-simulated', reviewedBy='fixture-reviewer-simulated'))
    for r in datasets['short-window']['entities']['weeklySchedules']:
        if r['ownerType'] == 'offering':
            change(r, startTime='12:00', endTime='12:10')
    datasets['variants'] = copy.deepcopy(one)
    add_offer(datasets['variants'], 'chicken-variant', variant='Sốt riêng — mô phỏng')
    datasets['same-variant-two-venues'] = copy.deepcopy(one)
    add_offer(datasets['same-variant-two-venues'], 'chicken-other-venue')
    datasets['profile-split'] = copy.deepcopy(one)
    def taste(spicy):
        return {k: {'present': spicy, 'intensity': 'high' if spicy else 'none'} if k == 'spicy'
                else {'present': None, 'intensity': 'unknown'} for k in ['spicy', 'salty', 'sweet', 'sour']}
    change(find(datasets['profile-split'], 'venueDishes', 'grill-chicken'),
           profileOverrides={'temperature': 'hot', 'flavor': taste(False)}, priceMin=70000, priceMax=70000)
    add_offer(datasets['profile-split'], 'chicken-cold-spicy',
              profile={'temperature': 'cold', 'flavor': taste(True)}, price=20000)
    datasets['base-reordered'] = copy.deepcopy(base)
    for rows in datasets['base-reordered']['entities'].values():
        rows.reverse()

    cases = []
    all_ids = [fixture_id('venueDishes', key) for key in keys]
    chicken = fixture_id('venueDishes', 'grill-chicken')
    common_context = dict(anchorId=fixture_id('publicAnchors', 'anchor'), coverageId=fixture_id('coverageAreas', 'area'),
        radiusM=1000, desiredAt=DAY, mealSlot='lunch', timeHint=None, serviceMode='dine_in',
        budget=None, avoidRecent=False, contextVersion=1)
    preferences = dict(A={'categoryIds': [fixture_id('taxonomy', 'preparation:grilled')]},
                       B={'categoryIds': [fixture_id('taxonomy', 'family:hotpot')]})

    def case(key, group, dataset, description, eligible, *, excluded=(), confirm=(), size=None,
             at=DAY, desired=None, context=None, assertions=(), required=(), details=None, prefs=None, time_input=None):
        ctx = copy.deepcopy(common_context)
        ctx.update(desiredAt=desired or at)
        ctx.update(context or {})
        maximum = size if size is not None else min(len(eligible), 8)
        expected = dict(eligibleOfferingIds=list(eligible),
            excludedOfferings=[dict(offeringId=o, reason=r) for o, r in excluded],
            needsConfirmationOfferings=[dict(offeringId=o, reason=r) for o, r in confirm],
            pool=dict(minSize=maximum, maxSize=maximum, uniqueBy=['dishId', 'variant'],
                      requiredCategoryCodes=list(required), includeAllEligibleCandidates=maximum < 8),
            assertions=list(assertions), details=details or {})
        cases.append(dict(id=key, group=group, description=description + ' (mô phỏng)', specRefs=SPECS,
            datasetKey=dataset, evaluatedAt=at,
            input=dict(context=ctx, preferencesByParticipant=copy.deepcopy(preferences if prefs is None else prefs),
                       poolSeed='gm03-fixture-seed-01',
                       timeSelection=time_input or dict(mode='scheduled', requestedAt=ctx['desiredAt'], bufferMinutes=0)),
            expected=expected))

    case('pool-ten', 'pool', 'base', '10 ứng viên, tối đa 8, không chỉ định tám món thắng', all_ids, size=8,
         required=['preparation:grilled', 'family:hotpot'], assertions=['pool_limit', 'category_representation'])
    case('pool-eight', 'pool', 'eight', 'Đúng 8 ứng viên, không bổ sung', all_ids[:8], size=8,
         assertions=['pool_limit', 'use_actual_count'])
    case('pool-three', 'pool', 'three', 'Chỉ 3 món, giữ số thực', all_ids[:3], size=3, assertions=['use_actual_count'])
    case('pool-empty', 'pool', 'no-offering', 'Có món nhưng không có offering', [], size=0,
         assertions=['empty_has_reason'], details={'emptyReason': 'no_evidenced_offering'})
    case('preferences-conflict', 'preferences', 'three', 'A nướng, B lẩu là ưu tiên mềm', all_ids[:3], size=3,
         required=['preparation:grilled', 'family:hotpot'], assertions=['category_is_soft', 'category_representation'])
    case('preferences-skipped', 'preferences', 'three', 'Bỏ qua category không thành NO', all_ids[:3], size=3,
         prefs={'A': {'categoryIds': []}, 'B': {'categoryIds': []}}, assertions=['category_is_soft'])
    case('identity-multilabel', 'identity', 'multi', 'Một lựa chọn có hai nhãn vẫn chỉ một candidate', [all_ids[4]], size=1,
         required=['preparation:grilled', 'family:hotpot'], assertions=['multilabel_not_duplicate'])
    case('identity-alias', 'identity', 'one', 'Tên chính và alias cùng ID', [chicken], size=1,
         assertions=['alias_same_identity'], details={'aliasResolutions': [
             {'text': 'Gà nướng — mô phỏng', 'dishId': fixture_id('dishes', 'grill-chicken')},
             {'text': 'Thịt gà nướng — mô phỏng', 'dishId': fixture_id('dishes', 'grill-chicken')} ]})
    case('identity-variants', 'identity', 'variants', 'Hai variant của cùng món giữ offering riêng',
         [chicken, fixture_id('venueDishes', 'chicken-variant')], size=2, assertions=['preserve_variants'])
    case('identity-two-venues', 'identity', 'same-variant-two-venues', 'Cùng món/variant tại hai quán chỉ một candidate',
         [chicken, fixture_id('venueDishes', 'chicken-other-venue')], size=1, assertions=['multilabel_not_duplicate'])
    budget = {'min': 20000, 'max': 40000, 'currency': 'VND', 'unit': 'person'}
    case('price-missing', 'price', 'missing-price', 'Thiếu giá không thành 0 và không loại món', [chicken], size=1,
         context={'budget': budget}, assertions=['unknown_price_not_zero'],
         details={'priceExpectation': {'offeringId': chicken, 'priceMin': None, 'priceMax': None, 'unit': None, 'currency': None}})
    case('price-over-budget', 'price', 'over-budget', 'Giá vượt budget chỉ ảnh hưởng ưu tiên', [chicken], size=1,
         context={'budget': budget}, assertions=['budget_is_soft'])
    case('price-budget-null', 'price', 'three', 'Budget null không tự gán trần giá hoặc loại món', all_ids[:3], size=3,
         assertions=['budget_is_soft'], details={'budgetExpectation': None})
    case('price-group-unit', 'price', 'group-price', 'Không chia giá nhóm thành giá mỗi người', [chicken], size=1,
         context={'budget': budget}, assertions=['group_price_not_per_person'],
         details={'priceExpectation': {'offeringId': chicken, 'priceMin': 240000, 'priceMax': 240000, 'unit': 'group', 'currency': 'VND'}, 'budgetComparable': False})
    case('profile-unknown', 'profile', 'one', 'Nhiệt độ/vị chưa biết không bị tự điền', [chicken], size=1,
         assertions=['unknown_traits_preserved'])
    case('profile-no-merge', 'profile', 'profile-split', 'Không ghép nóng ở quán A với cay/giá rẻ ở quán B',
         [chicken, fixture_id('venueDishes', 'chicken-cold-spicy')], size=1,
         assertions=['no_cross_offering_profile'],
         details={'forbiddenComposite': {'dishId': fixture_id('dishes', 'grill-chicken'), 'temperature': 'hot', 'spicy': True, 'priceMax': 20000}})
    case('meal-unknown', 'meal', 'missing-meal', 'Buổi chưa xác định không được giả là lunch', [], size=0,
         confirm=[(chicken, 'meal_unknown')], assertions=['unknown_meal_not_assumed'])
    for key, at, eligible, reason, assertion in [
        ('night-before-open', '2026-10-09T14:59:59Z', [], 'outside_schedule', 'opening_inclusive'),
        ('night-at-open', '2026-10-09T15:00:00Z', [chicken], None, 'opening_inclusive'),
        ('night-after-midnight', '2026-10-09T17:30:00Z', [chicken], None, 'overnight_carry'),
        ('night-before-close', '2026-10-09T18:59:59Z', [chicken], None, 'closing_exclusive'),
        ('night-at-close', '2026-10-09T19:00:00Z', [], 'outside_schedule', 'closing_exclusive'),
    ]:
        case(key, 'overnight', 'night', key, eligible, size=len(eligible), at=at,
             context={'mealSlot': 'dinner', 'timeHint': 'late_night'},
             excluded=[(chicken, reason)] if reason else [], assertions=[assertion])
    case('schedule-venue-intersection', 'schedule', 'venue-closed', 'Món mở nhưng quán chưa mở', [], size=0,
         excluded=[(chicken, 'outside_venue_schedule')], assertions=['venue_offering_intersection'])
    case('schedule-gap', 'schedule', 'split-gap', 'Giờ nghỉ giữa hai ca', [], size=0,
         excluded=[(chicken, 'between_shifts')], assertions=['split_shift_gap'])
    case('schedule-closed-next-day', 'schedule', 'night-closed-next-day', 'Ngày đóng cửa chặn ca qua đêm hôm trước', [], size=0,
         at='2026-10-09T17:30:00Z', context={'mealSlot': 'dinner', 'timeHint': 'late_night'},
         excluded=[(chicken, 'closed_date_exception')], assertions=['closed_exception_blocks_carry'])
    case('geography-outside-area', 'geography', 'outside-area', 'Anchor ngoài coverage', [], size=0,
         excluded=[(chicken, 'outside_coverage')], assertions=['no_coverage_expansion'])
    case('geography-outside-radius', 'geography', 'outside-radius', 'Quán trong coverage nhưng ngoài radius', [], size=0,
         excluded=[(chicken, 'outside_radius')], assertions=['no_radius_expansion'])
    case('geography-origin', 'geography', 'southern-origin', 'Origin Nam không giới hạn vị trí bán', [chicken], size=1,
         assertions=['origin_not_location'])
    case('freshness-before-expiry', 'freshness', 'source-expiry', 'Nguồn ngay trước hạn cuối', [chicken], size=1,
         at='2026-10-10T04:59:59Z', assertions=['source_freshness'])
    case('freshness-at-expiry', 'freshness', 'source-expiry', 'Đúng validUntil nguồn không còn hiệu lực', [], size=0,
         confirm=[(chicken, 'source_expired')], assertions=['source_expiry_exclusive', 'dataset_does_not_extend_child'])
    case('freshness-after-expiry', 'freshness', 'source-expiry', 'Nguồn hết hạn dù dataset còn hạn', [], size=0,
         at='2026-10-10T05:00:01Z', confirm=[(chicken, 'source_expired')], assertions=['dataset_does_not_extend_child'])
    case('freshness-menu-unknown', 'freshness', 'unknown-menu', 'Menu chưa có nguồn xác minh', [], size=0,
         confirm=[(chicken, 'menu_unknown')], assertions=['unknown_menu_requires_confirmation'])
    case('freshness-hours-unknown', 'freshness', 'unknown-hours', 'Lịch món unknown', [], size=0,
         confirm=[(chicken, 'schedule_unknown')], assertions=['unknown_schedule_requires_confirmation'])
    for key, dataset in [('availability-sold-out', 'sold-out'), ('availability-paused', 'paused')]:
        case(key, 'availability', dataset, 'Override còn hiệu lực loại offering', [], size=0,
             at='2026-10-10T04:59:59Z', excluded=[(chicken, dataset.replace('-', '_'))],
             assertions=['active_stock_override_excludes'])
    case('availability-expired', 'availability', 'sold-out', 'Override hết hạn quay về unknown, lịch vẫn hợp lệ', [chicken], size=1,
         assertions=['expired_stock_override_unknown', 'schedule_not_live_stock'],
         details={'availabilityExpectation': {'offeringId': chicken, 'state': 'unknown', 'liveStockClaim': False}})
    case('availability-schedule-only', 'availability', 'one', 'Không có override: chỉ dự kiến theo lịch', [chicken], size=1,
         assertions=['schedule_not_live_stock'],
         details={'availabilityExpectation': {'offeringId': chicken, 'state': 'unknown', 'liveStockClaim': False}})
    case('context-scheduled', 'context', 'short-window', 'Đặt giờ cụ thể không cộng buffer lần hai', [chicken], size=1,
         at='2026-10-10T04:00:00Z', desired=DAY, assertions=['scheduled_no_second_buffer'],
         time_input={'mode': 'scheduled', 'requestedAt': DAY, 'bufferMinutes': 15}, details={'normalizedDesiredAt': DAY})
    case('context-now-buffer', 'context', 'short-window', 'Server now cộng buffer đúng một lần', [chicken], size=1,
         at='2026-10-10T04:45:00Z', desired=DAY, assertions=['now_buffer_once'],
         time_input={'mode': 'now', 'requestedAt': None, 'bufferMinutes': 15}, details={'normalizedDesiredAt': DAY})
    case('context-past', 'context', 'one', 'desiredAt đã qua cần xác nhận lại trước start', [], size=0,
         at='2026-10-10T05:01:00Z', desired=DAY, confirm=[(chicken, 'context_time_elapsed')],
         assertions=['past_time_requires_confirmation'], details={'contextOutcome': 'needs_confirmation', 'resetReady': True})
    case('determinism-repeat', 'determinism', 'base', 'Cùng snapshot/context/seed cho cùng kết quả', all_ids, size=8,
         required=['preparation:grilled', 'family:hotpot'], assertions=['same_seed_same_pool'])
    case('determinism-reordered', 'determinism', 'base-reordered', 'Đảo thứ tự nguồn không đổi ý nghĩa', all_ids, size=8,
         required=['preparation:grilled', 'family:hotpot'], assertions=['source_order_invariant'])
    # 8 candidates must all remain; 10 candidates allow any valid, diverse eight.
    for c in cases:
        if c['id'] == 'pool-eight':
            c['expected']['pool']['includeAllEligibleCandidates'] = True
    suite = dict(fixtureVersion=FIXTURE_VERSION, fixtureOnly=True, contractVersion='1.0.0',
        validationAt=VALIDATION_AT, part3Commit=PART3_COMMIT, cases=cases,
        comparisons=[dict(id='same-seed-and-source-order', kind='sameOrderedPool',
                          caseIds=['pool-ten', 'determinism-repeat', 'determinism-reordered'])])
    for entity, extra_keys in [
        ('venueDishes', ['chicken-variant', 'chicken-other-venue', 'chicken-cold-spicy']),
        ('scheduleGroups', ['chicken-variant', 'chicken-other-venue', 'chicken-cold-spicy']),
        ('weeklySchedules', ['split-5', 'split-6'] + [k + '-' + str(d) for k in
            ['chicken-variant', 'chicken-other-venue', 'chicken-cold-spicy'] for d in [5, 6]]),
        ('dateExceptions', ['closed-saturday']), ('availabilityOverrides', ['sold-out', 'paused']),
    ]:
        registry.extend(dict(entity=entity, registryKey=k, id=fixture_id(entity, k)) for k in extra_keys)
    return datasets, suite, registry


def validate_suite(datasets, suite, registry):
    """Integrity and coverage only. Does not predict eligibility or rank a pool."""
    errors = []
    def error(where, field, message):
        errors.append(dict(location=where, field=field, message=message))
    try:
        if set(suite) != {'fixtureVersion', 'fixtureOnly', 'contractVersion', 'validationAt', 'part3Commit', 'cases', 'comparisons'}:
            error('suite', 'root', 'Unexpected/missing fields')
        if suite['fixtureOnly'] is not True or suite['fixtureVersion'] != FIXTURE_VERSION or suite['contractVersion'] != '1.0.0':
            error('suite', 'fixtureOnly', 'Explicit synthetic fixture v1 required')
        if suite['part3Commit'] != PART3_COMMIT:
            error('suite', 'part3Commit', 'Reference the committed Part 3 snapshot')
        validation_at = dc.utc(suite['validationAt'])
        if suite['validationAt'] != VALIDATION_AT:
            error('suite', 'validationAt', 'Use the fixed structural validation clock')
        registry_ids = {}
        for entry in registry:
            identity = (entry['entity'], entry['id'])
            if identity in registry_ids or entry['id'] != fixture_id(entry['entity'], entry['registryKey']):
                error('registry', 'id', 'Duplicate or unstable fixture ID')
            registry_ids[identity] = entry['registryKey']
        real_ids = {r['id'] for r in json.loads((BASE / 'config/base_dish_registry.json').read_text())['dishes']}
        for name, bundle in datasets.items():
            if bundle['fixtureOnly'] is not True:
                error(name, 'fixtureOnly', 'Fixtures must not become real data')
            for problem in dc.validate(bundle, validation_at):
                error(name + '/' + problem['entity'], str(problem['row']) + '/' + problem['field'], problem['message'])
            for entity, rows in bundle['entities'].items():
                pk = dc.ENTITIES[entity]['primaryKey']
                for row in rows:
                    if (entity, row[pk]) not in registry_ids or row[pk] in real_ids:
                        error(name + '/' + entity, pk, 'ID not in synthetic registry or collides with real catalogue')
                    if row['reviewStatus'] == 'published' or row.get('status') == 'published':
                        error(name + '/' + entity, 'reviewStatus', 'Fixtures cannot publish')
                    if row['enteredBy'] != 'fixture-author-simulated' or row['reviewedBy'] not in [None, 'fixture-reviewer-simulated']:
                        error(name + '/' + entity, 'enteredBy', 'Use explicit simulated provenance')
                    if row.get('artwork') is not None:
                        error(name + '/' + entity, 'artwork', 'No real images in fixture suite')
                    if entity == 'dataSources' and urlsplit(row['locator']).hostname != 'example.invalid':
                        error(name + '/' + entity, 'locator', 'Only example.invalid source URLs allowed')
                    if entity in ['dishes', 'venues', 'publicAnchors', 'coverageAreas']:
                        label = row.get('name', row.get('branchName', ''))
                        if not any(s in label for s in ['mô phỏng', 'giả lập']):
                            error(name + '/' + entity, 'name', 'Synthetic label required')
                    if entity == 'dishes' and row['ingredientTags'] is not None:
                        error(name + '/' + entity, 'ingredientTags', 'Do not invent ingredient/allergy claims')
        seen_cases, groups, covered = set(), set(), set()
        indexed_cases = {}
        for number, case in enumerate(suite['cases'], 1):
            where = 'case/' + str(number)
            try:
                expected_keys = {'id', 'group', 'description', 'specRefs', 'datasetKey', 'evaluatedAt', 'input', 'expected'}
                if set(case) != expected_keys:
                    raise ValueError('Unexpected/missing case keys')
                where = case['id']
                if not isinstance(case['id'], str) or case['id'] in seen_cases:
                    error(where, 'id', 'Duplicate/invalid case ID')
                seen_cases.add(case['id']); indexed_cases[case['id']] = case
                groups.add(case['group'])
                if case['group'] not in GROUPS or 'mô phỏng' not in case['description']:
                    error(where, 'group', 'Known group and synthetic description required')
                if not case['specRefs'] or any(ref not in SPECS or not (ROOT / ref).is_file() for ref in case['specRefs']):
                    error(where, 'specRefs', 'Real local spec references required')
                evaluated_at = dc.utc(case['evaluatedAt'])
                if evaluated_at < validation_at:
                    error(where, 'evaluatedAt', 'Evaluation must follow structural validation')
                bundle = datasets[case['datasetKey']]
                entities = bundle['entities']
                offers = {r['offeringId']: r for r in entities['venueDishes']}
                dishes = {r['id']: r for r in entities['dishes']}
                taxonomy = {r['id']: r for r in entities['taxonomy']}
                payload = case['input']
                if set(payload) != {'context', 'preferencesByParticipant', 'poolSeed', 'timeSelection'}:
                    raise ValueError('Fixture input fields mismatch')
                context = payload['context']
                if set(context) != {'anchorId', 'coverageId', 'radiusM', 'desiredAt', 'mealSlot', 'timeHint', 'serviceMode', 'budget', 'avoidRecent', 'contextVersion'}:
                    raise ValueError('Context fields mismatch; do not pass raw GPS')
                anchor = next(r for r in entities['publicAnchors'] if r['anchorId'] == context['anchorId'])
                if anchor['coverageId'] != context['coverageId'] or not anchor['isPublic']:
                    error(where, 'context.anchorId', 'Anchor/coverage/public reference mismatch')
                dc.utc(context['desiredAt'])
                if type(context['radiusM']) is not int or context['radiusM'] <= 0:
                    error(where, 'context.radiusM', 'Positive integer metres required')
                if context['mealSlot'] not in ['breakfast', 'lunch', 'dinner', 'snack'] or context['timeHint'] not in [None, 'late_night']:
                    error(where, 'context.mealSlot', 'Known meal/time hint required')
                if context['serviceMode'] not in ['dine_in', 'takeaway', 'delivery']:
                    error(where, 'context.serviceMode', 'Unknown service mode')
                if type(context['contextVersion']) is not int or context['contextVersion'] < 1 or type(context['avoidRecent']) is not bool:
                    error(where, 'context.contextVersion', 'Version/flag invalid')
                budget = context['budget']
                if budget is not None:
                    if set(budget) != {'min', 'max', 'currency', 'unit'} or any(type(budget[k]) is not int or budget[k] < 0 for k in ['min', 'max']) or budget['min'] > budget['max'] or budget['currency'] != 'VND' or budget['unit'] != 'person':
                        error(where, 'context.budget', 'Fixture budget is nullable VND/person range')
                if not isinstance(payload['poolSeed'], str) or not payload['poolSeed']:
                    error(where, 'poolSeed', 'Seed required')
                for user, prefs in payload['preferencesByParticipant'].items():
                    if set(prefs) != {'categoryIds'} or not isinstance(prefs['categoryIds'], list):
                        raise ValueError('Preference fields mismatch')
                    if len(prefs['categoryIds']) != len(set(prefs['categoryIds'])) or any(x not in taxonomy or taxonomy[x]['type'] != 'category' for x in prefs['categoryIds']):
                        error(where, 'preferencesByParticipant/' + user, 'Unknown/duplicate category reference')
                selection = payload['timeSelection']
                if set(selection) != {'mode', 'requestedAt', 'bufferMinutes'} or selection['mode'] not in ['now', 'scheduled'] or type(selection['bufferMinutes']) is not int or selection['bufferMinutes'] < 0:
                    error(where, 'timeSelection', 'Explicit mode/buffer required')
                elif selection['mode'] == 'scheduled':
                    dc.utc(selection['requestedAt'])
                elif selection['requestedAt'] is not None:
                    error(where, 'timeSelection.requestedAt', 'now uses evaluatedAt as server clock')
                expected = case['expected']
                if set(expected) != {'eligibleOfferingIds', 'excludedOfferings', 'needsConfirmationOfferings', 'pool', 'assertions', 'details'}:
                    raise ValueError('Expected fields mismatch')
                ids = list(expected['eligibleOfferingIds'])
                for field in ['excludedOfferings', 'needsConfirmationOfferings']:
                    for entry in expected[field]:
                        if set(entry) != {'offeringId', 'reason'} or not isinstance(entry['reason'], str) or not entry['reason']:
                            raise ValueError('Offering reason required')
                        ids.append(entry['offeringId'])
                if len(ids) != len(set(ids)) or set(ids) != set(offers):
                    error(where, 'expected', 'Expected states must partition every offering exactly once')
                pool = expected['pool']
                if set(pool) != {'minSize', 'maxSize', 'uniqueBy', 'requiredCategoryCodes', 'includeAllEligibleCandidates'}:
                    raise ValueError('Pool assertion fields mismatch')
                if any(type(pool[k]) is not int for k in ['minSize', 'maxSize']) or not 0 <= pool['minSize'] <= pool['maxSize'] <= 8:
                    error(where, 'expected.pool', 'Pool must have integer bounds within 0..8')
                if pool['uniqueBy'] != ['dishId', 'variant'] or type(pool['includeAllEligibleCandidates']) is not bool:
                    error(where, 'expected.pool.uniqueBy', 'Deduplicate dish/variant; explicit inclusion flag required')
                allowed = [offers[x] for x in expected['eligibleOfferingIds'] if x in offers]
                identities = {(r['dishId'], r['variant']) for r in allowed}
                if pool['maxSize'] > len(identities) or (pool['includeAllEligibleCandidates'] and not pool['minSize'] == pool['maxSize'] == len(identities)):
                    error(where, 'expected.pool', 'Pool bounds disagree with authored candidate set')
                present_codes = {taxonomy[x]['code'] for r in allowed for x in dishes[r['dishId']]['categoryIds']}
                if len(set(pool['requiredCategoryCodes'])) != len(pool['requiredCategoryCodes']) or set(pool['requiredCategoryCodes']) - present_codes:
                    error(where, 'expected.pool.requiredCategoryCodes', 'Required categories absent from allowed candidates')
                if pool['maxSize'] == 0 and not (expected['excludedOfferings'] or expected['needsConfirmationOfferings'] or expected['details'].get('emptyReason')):
                    error(where, 'expected.details.emptyReason', 'Empty pool needs a reason')
                if not expected['assertions'] or set(expected['assertions']) - ASSERTIONS:
                    error(where, 'expected.assertions', 'Known, nonempty assertions required')
                covered.update(expected['assertions'])
                details = expected['details']
                if set(details) - {'emptyReason', 'aliasResolutions', 'priceExpectation', 'budgetComparable', 'budgetExpectation', 'forbiddenComposite', 'availabilityExpectation', 'normalizedDesiredAt', 'contextOutcome', 'resetReady'}:
                    error(where, 'expected.details', 'Unknown assertion details')
                for alias in details.get('aliasResolutions', []):
                    dish = dishes.get(alias['dishId'])
                    if not dish or alias['text'] not in [dish['name'], *dish['aliases']]:
                        error(where, 'expected.details.aliasResolutions', 'Alias not present on referenced dish')
                for field in ['priceExpectation', 'availabilityExpectation']:
                    if field in details and details[field]['offeringId'] not in offers:
                        error(where, 'expected.details/' + field, 'Unknown offering')
                if 'priceExpectation' in details:
                    p = details['priceExpectation']; source = offers.get(p['offeringId'])
                    if source and any(p[k] != source[k] for k in ['priceMin', 'priceMax', 'unit', 'currency']):
                        error(where, 'expected.details.priceExpectation', 'Price expectation differs from authored source')
                if 'forbiddenComposite' in details and details['forbiddenComposite']['dishId'] not in dishes:
                    error(where, 'expected.details.forbiddenComposite', 'Unknown dish')
                if 'normalizedDesiredAt' in details and details['normalizedDesiredAt'] != context['desiredAt']:
                    error(where, 'expected.details.normalizedDesiredAt', 'Expected time must equal authored context time')
            except (KeyError, TypeError, ValueError, StopIteration, AttributeError) as exc:
                error(where, 'root', 'Invalid fixture case: ' + str(exc))
        if groups != GROUPS:
            error('suite', 'groups', 'Missing/unknown scenario groups: ' + str(sorted(GROUPS - groups)))
        if covered != ASSERTIONS:
            error('suite', 'assertions', 'Missing assertion coverage: ' + str(sorted(ASSERTIONS - covered)))
        for comparison in suite['comparisons']:
            if set(comparison) != {'id', 'kind', 'caseIds'} or comparison['kind'] != 'sameOrderedPool' or len(comparison['caseIds']) < 2:
                error('comparisons', 'root', 'Known comparison with at least two cases required')
                continue
            refs = [indexed_cases.get(k) for k in comparison['caseIds']]
            if not all(refs):
                error('comparisons', 'caseIds', 'Unknown case reference')
                continue
            first = refs[0]
            for c in refs[1:]:
                if c['input'] != first['input'] or c['evaluatedAt'] != first['evaluatedAt'] or set(c['expected']['eligibleOfferingIds']) != set(first['expected']['eligibleOfferingIds']):
                    error('comparisons', 'caseIds', 'Determinism pair has different authored context/seed/eligible set')
                def canonical(bundle):
                    result = copy.deepcopy(bundle)
                    for entity, rows in result['entities'].items():
                        rows.sort(key=lambda row: row[dc.ENTITIES[entity]['primaryKey']])
                    return result
                if canonical(datasets[c['datasetKey']]) != canonical(datasets[first['datasetKey']]):
                    error('comparisons', 'datasetKey', 'sameOrderedPool pair differs beyond source row order')
    except (KeyError, TypeError, ValueError, AttributeError) as exc:
        error('suite', 'root', 'Invalid fixture structure: ' + str(exc))
    return errors


def export(datasets, suite, registry, directory=OUTPUT):
    errors = validate_suite(datasets, suite, registry)
    if errors:
        raise ValueError(errors)
    out = Path(directory)
    resolved = out.resolve()
    if resolved.is_relative_to(ROOT.resolve()) and not (
        resolved.is_relative_to(OUTPUT.resolve()) or resolved.is_relative_to((BASE / 'datasets/food-fixtures').resolve())
    ):
        raise ValueError('Fixture export inside repo is restricted to its isolated fixture/report folders')
    out.mkdir(parents=True, exist_ok=True)
    save_json(out / 'base.json', datasets['base'])
    save_json(out / 'datasets.json', datasets)
    save_json(out / 'cases.json', suite)
    save_json(out / 'registry.json', registry)
    dc.write_csv_bundle(datasets['base'], out / 'base-csv')
    if dc.read_csv_bundle(out / 'base-csv') != datasets['base']:
        raise ValueError('Fixture CSV/JSON semantic mismatch')
    stats = dict(fixtureOnly=True, fixtureVersion=FIXTURE_VERSION, cases=len(suite['cases']), datasets=len(datasets),
        groups=dict(sorted(Counter(c['group'] for c in suite['cases']).items())),
        baseDishes=len(datasets['base']['entities']['dishes']),
        baseEntities={k: len(v) for k, v in datasets['base']['entities'].items()},
        assertions=len(ASSERTIONS), part3Commit=PART3_COMMIT, validationAt=VALIDATION_AT,
        networkCalls=0, eligibilityExecuted=False, publicationPerformed=False)
    save_json(out / 'quality.json', stats)
    save_json(out / 'manifest.json', dict(statistics=stats, generatorSha256=hash_file(Path(__file__)),
        files={str(p.relative_to(out)): dict(sha256=hash_file(p), bytes=p.stat().st_size)
               for p in sorted(out.rglob('*')) if p.is_file() and p.name != 'manifest.json'}))
    return stats


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Read tracked fixtures and check integrity without rewriting')
    parser.add_argument('--output', type=Path, default=OUTPUT)
    args = parser.parse_args()
    if args.check:
        datasets, suite, registry = [json.loads((args.output / name).read_text(encoding='utf-8'))
                                   for name in ['datasets.json', 'cases.json', 'registry.json']]
        errors = validate_suite(datasets, suite, registry)
        if not errors and dc.read_csv_bundle(args.output / 'base-csv') != datasets['base']:
            errors.append(dict(location='base-csv', field='root', message='CSV/JSON mismatch'))
        if not errors and json.loads((args.output / 'base.json').read_text()) != datasets['base']:
            errors.append(dict(location='base.json', field='root', message='Base snapshot mismatch'))
        manifest = json.loads((args.output / 'manifest.json').read_text())
        if manifest['generatorSha256'] != hash_file(Path(__file__)):
            errors.append(dict(location='manifest', field='generatorSha256', message='Generator changed; review and regenerate fixtures'))
        for filename, metadata in manifest['files'].items():
            path = args.output / filename
            if not path.is_file() or hash_file(path) != metadata['sha256']:
                errors.append(dict(location=filename, field='sha256', message='Fixture checksum mismatch'))
        print(json.dumps(dict(valid=not errors, errors=errors, eligibilityExecuted=False), ensure_ascii=False, indent=2))
        raise SystemExit(bool(errors))
    print(json.dumps(export(*build_suite(), args.output), ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
