/** Reference-only notification projection. */
export function notification(d) {
 if (!['ROOM_INVITED','ROOM_RESULT_READY'].includes(d.kind)) throw new Error('UNSUPPORTED_NOTIFICATION_KIND');
 const type=d.kind==='ROOM_INVITED'?'room_invite':'room_result';
 const data={type,eventId:d.eventId};
 for(const key of ['roomId','invitationId','resultId','status','contractVersion','eventVersion'])
  if(d[key]!==null&&d[key]!==undefined)data[key]=d[key];
 return {to:d.token,title:type==='room_invite'?'Lời mời vào phòng':'Kết quả phòng đã sẵn sàng',body:type==='room_invite'?'Bạn có lời mời vào phòng mới':'Phòng của bạn đã có kết quả',data};
}
