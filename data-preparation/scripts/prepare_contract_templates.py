"""Generate versioned CSV/JSON forms and explicitly synthetic draft examples."""
from __future__ import annotations
import json
from pathlib import Path
from data_contract import BASE, SCHEMA, ENTITIES, validate, write_csv_bundle, read_csv_bundle
from base_catalogue import stable_id

def empty_bundle():
    return {'contractVersion':'1.0.0','datasetVersion':'0.1.0','fixtureOnly':True,'entities':{name:[] for name in ENTITIES}}

def example_bundle():
    bundle=empty_bundle();data=bundle['entities']
    def row(entity_name,key,**values):
        fields=ENTITIES[entity_name]['fields'];pk=ENTITIES[entity_name]['primaryKey']
        r={k:None if f['nullable'] else [] if f['type'] in ['stringArray','uuidArray','intervals'] else {} if f['type']=='object' else None for k,f in fields.items()}
        r.update({pk:stable_id(entity_name,key),'version':1,'reviewStatus':'draft','fieldSources':{},'checkedAt':'2026-10-09T00:00:00Z','validUntil':None,'enteredBy':'fixture-author','reviewedBy':None})
        r.update(values);data[entity_name].append(r);return r
    source=row('dataSources','fixture-source',locator='https://example.invalid/synthetic-menu',usageRights='unknown',status='draft')
    source_id=source['sourceRef']
    def sourced(entity_name,key,**values):return row(entity_name,key,sourceRef=source_id,**values)
    cuisine=sourced('taxonomy','fixture-cuisine',type='cuisine',code='vi',label='Việt',description='Fixture tổng hợp, không phải dữ liệu thật',status='draft')
    category=sourced('taxonomy','fixture-category',type='category',code='family:rice',label='Cơm',description='Họ món',status='draft')
    dish=sourced('dishes','fixture-rice',name='Cơm gà — fixture',aliases=[],cuisineIds=[cuisine['id']],categoryIds=[category['id']],mealSlots=['lunch'],timeHints=[],classificationStatus='needs_review',temperature='unknown',origin='unknown',sourceDishIds=[],status='draft')
    venue=sourced('venues','fixture-branch',branchName='Chi nhánh giả lập',address='Địa chỉ fixture, không tìm quán này',adminAreaId=None,lat=None,lng=None,timezone='Asia/Ho_Chi_Minh',status='unknown',serviceModes=['delivery'])
    group=stable_id('scheduleGroups','fixture-offering-schedule')
    offer=sourced('venueDishes','fixture-offer',venueId=venue['id'],dishId=dish['id'],variant='sốt riêng — fixture',menuName='Cơm gà sốt riêng — fixture',menuSource=source_id,scheduleId=group,serviceMode='delivery',priceMin=30000,priceMax=30000,unit='menu_item_unspecified',currency='VND',status='draft',fieldSources={'menu':source_id,'price':source_id})
    sourced('weeklySchedules','fixture-friday-night',scheduleId=group,ownerType='offering',ownerId=offer['offeringId'],dayOfWeek=5,startTime='22:00',endTime='02:00',endDayOffset=1,is24Hours=False,timezone='Asia/Ho_Chi_Minh',status='open')
    sourced('weeklySchedules','fixture-saturday-noon',scheduleId=group,ownerType='offering',ownerId=offer['offeringId'],dayOfWeek=6,startTime='11:00',endTime='14:00',endDayOffset=0,is24Hours=False,timezone='Asia/Ho_Chi_Minh',status='open')
    sourced('weeklySchedules','fixture-venue-unknown',scheduleId=stable_id('scheduleGroups','fixture-venue-schedule'),ownerType='venue',ownerId=venue['id'],dayOfWeek=5,status='unknown',is24Hours=False,timezone='Asia/Ho_Chi_Minh')
    sourced('dateExceptions','fixture-saturday-closed',scheduleId=group,localDate='2026-10-10',status='closed',intervals=[],lastOrder=None)
    sourced('availabilityOverrides','fixture-soldout',offeringId=offer['offeringId'],state='sold_out',source=source_id,observedAt='2026-10-09T15:00:00Z',expiresAt='2026-10-09T16:00:00Z')
    coverage=sourced('coverageAreas','fixture-area',name='Vùng giả lập, không là coverage Thủ Đức',boundary=None,datasetVersion=bundle['datasetVersion'])
    sourced('publicAnchors','fixture-anchor',name='Điểm công cộng giả lập',lat=10.85,lng=106.76,coverageId=coverage['areaId'],isPublic=True)
    sourced('datasetVersions','fixture-version',datasetVersion=bundle['datasetVersion'],contractVersion=bundle['contractVersion'],status='draft')
    return bundle

def generate():
    codebook=json.loads((BASE/'config/taxonomy_v1.json').read_text(encoding='utf-8'))
    registry=[]
    for kind,labels in [('cuisine',codebook['cuisines']),('origin',codebook['origins']),('category',{f'{g}:{k}':label for g,values in codebook['categoryGroups'].items() for k,label in values.items()})]:
        for code,label in labels.items():
            key=f'{kind}:{code}'
            registry.append({'registryKey':key,'id':stable_id('taxonomy',key),'type':kind,'code':code,'label':label,'version':1})
    (BASE/'config/taxonomy_registry_v1.json').write_text(json.dumps({'contractVersion':'1.0.0','status':'draft','entries':registry},ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    for name,bundle in [('empty',empty_bundle()),('examples',example_bundle())]:
        errors=validate(bundle)
        if errors:raise ValueError(errors)
        out=BASE/'templates'/name
        out.mkdir(parents=True,exist_ok=True)
        (out/'dataset.json').write_text(json.dumps(bundle,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
        write_csv_bundle(bundle,out)
        if read_csv_bundle(out)!=bundle:raise ValueError('JSON/CSV semantic mismatch')
    lines=['# Data dictionary — draft 1.0.0','',
           'Hợp đồng máy: [data_contract_v1.json](../config/data_contract_v1.json). Giá trị taxonomy: [taxonomy](TAXONOMY.md). Đầu vào theo [FOOD_DATA_SPEC](../../docs/specs/FOOD_DATA_SPEC.md); GM-28 chưa Approved. Đây là hợp đồng draft để review, không SQL/schema đã triển khai.','',
           '## Định danh và biểu diễn','',
           'UUIDv5: namespace UUIDv5(NAMESPACE_URL, `anyfood:food-v1:<entity>`), rồi UUIDv5(namespace, immutable registryKey). Giữ registry key trong cấu hình/registry, không lấy tên hiển thị để sinh lại ID. Registry món gốc dùng entity `dishes`; ID khảo sát nằm sourceDishIds. Bản ghi đổi nội dung tăng version nguyên dương; datasetVersion/contractVersion SemVer, checksum SHA-256 là nội dung artifact.','',
           'Các mã cuisine/category trong sourceProfiles của snapshot là mã tra cứu, không phải UUID. Registry taxonomy_registry_v1.json ánh xạ type/code → canonical UUID; adapter dùng registry này để dựng cuisineIds/categoryIds. Không coi registry label là nội dung đã review.','',
           'Bundle JSON có contractVersion, datasetVersion, fixtureOnly, entities. Tất cả entity arrays bắt buộc, cho phép []. CSV mỗi entity một file, header camelCase cùng JSON; bundle.json chỉ chứa metadata. Tên camelCase venueDishes/weeklySchedules/dateExceptions/availabilityOverrides/coverageAreas/publicAnchors/dataSources/datasetVersions tương ứng tên snake_case trong spec. Không rename contract app hiện có.','',
           'Mọi key trong bảng phải có. Nullable: JSON null, CSV ô trống. Array/object lưu JSON trong một ô CSV; [] là danh sách hiện chưa có dữ liệu, kết hợp classificationStatus/evidence để phân biệt chưa biết. Chuỗi rỗng không là mô tả hợp lệ; dùng null nếu nullable. Boolean true/false, số không kèm dấu phân cách/đơn vị. unknown chỉ dùng trong enum cho phép. Không dùng 0/false thay thiếu dữ liệu. CSV UTF-8 BOM, newline LF ở forms; snapshot nguồn giữ nguyên byte/CRLF.','',
           'Các cột sourceRef/checkedAt/validUntil/reviewedBy có thể null ở draft. verified/published cần nguồn, ngày kiểm, hạn còn hiệu lực và reviewer khác enteredBy. Fixture tuyệt đối không publish. Validator kiểm dữ liệu, không cấp quyền publisher hoặc chứng minh human approval. Giữ trạng thái unknown/quyền ảnh unknown khi thiếu bằng chứng; không tự thêm TTL 7/30 ngày đang chờ GM-28.','',
           'Nguồn theo nhóm trong fieldSources: name/description/taxonomy/image/menu/price/coordinates/address/hours/availability/coverage → UUID dataSources. Thiếu nguồn thì bỏ key đó, không ghi null. Artwork gồm url/sourceRef/usageRights/license/attribution; URL không cấp quyền ảnh. Flavor có đủ spicy/salty/sweet/sour, mỗi vị {present: true|false|null, intensity: none|low|medium|high|unknown}. profileOverrides chỉ chứa các trường taxonomy đã định nghĩa của riêng offering.','',
           'weeklySchedules.id là ID hàng ca; scheduleId là ID nhóm lịch dùng qua nhiều ca/ngày. Mọi hàng cùng nhóm phải cùng owner/timezone/reviewStatus. FK offering/date exception trỏ nhóm scheduleId. ownerType venue→venues.id, offering→venueDishes.offeringId. Có lịch quán và lịch món riêng, không dùng giờ menu giao hàng làm bằng chứng dine_in.','',
           'Khoảng giờ [start,end), dayOfWeek ISO 1–7, HH:mm địa phương. endDayOffset=1 cho qua đêm. 24h phải is24Hours=true và khoảng đúng 1440 phút. Closed/unknown: times null, offset null, is24Hours=false. Date exception closed chặn cả ca hôm trước kéo sang ngày đóng; interval [] không có nghĩa luôn mở. Quan hệ này là yêu cầu GM-30, validator chỉ kiểm hình dạng và tính nhất quán dữ liệu. Override hết expiresAt trở về unknown, không xác nhận còn món.','',
           'Giá không âm, min<=max, có giá phải có currency/unit; VND giữ giá nguồn, menu_item_unspecified không đổi sang giá/người. Không lấy giá rẻ của offering A và đặc tính của offering B thành card giả.','',
           'Đơn vị tọa độ WGS84 độ thập phân; GeoJSON dùng [lng,lat]. UTC timestamp ISO 8601 kết thúc Z. Timezone mặc định ở ví dụ Asia/Ho_Chi_Minh, mỗi quán phải có timezone được xác minh. Origin không lọc địa lý; coverage/anchor là công cộng, không chứa GPS người dùng.','']
    for name,definition in ENTITIES.items():
        lines += [f'## {name}', '', '| Trường | Kiểu | Nullable | Giá trị/đơn vị/tham chiếu | Ý nghĩa |','|---|---|---|---|---|']
        for key,field in definition['fields'].items():
            constraints=','.join(field.get('values',[])) or (f"FK {field['ref']}.{field.get('refKey',ENTITIES[field['ref']]['primaryKey'])}" if field.get('ref') else '')
            if 'min' in field:constraints+=f"; min={field['min']}"
            if 'max' in field:constraints+=f"; max={field['max']}"
            lines.append(f"| {key} | {field['type']} | {'Có' if field['nullable'] else 'Không'} | {constraints or 'Theo quy định trên'} | {field['description']} |")
        lines.append('')
    lines += ['## Ví dụ và kiểm tra','',
              '[Hướng dẫn forms](../templates/README.md) chỉ vị trí CSV/JSON trống và bộ ví dụ fixture tương đương. Ví dụ từng trường có ngay ở templates/examples/dataset.json và CSV cùng entity.','',
              'GM-04 làm SQL constraints/import transaction; GM-27 xác minh quán/nguồn/giờ/quyền; GM-30 áp dụng lịch, coverage, giá và unknown để tạo pool. Bộ hợp đồng này không thực thi các task đó.']
    (BASE/'docs/DATA_DICTIONARY.md').write_text('\n'.join(lines)+'\n',encoding='utf-8',newline='\n')

if __name__=='__main__':generate()
