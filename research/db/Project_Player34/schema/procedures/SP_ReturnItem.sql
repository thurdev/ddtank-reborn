-- SQL_STORED_PROCEDURE dbo.SP_ReturnItem (modified 2021-06-04T05:18:35.660)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<邮件信息：已废>
-- =============================================
CREATE Procedure [dbo].[SP_ReturnItem]
as

set xact_abort on 
begin tran

     INSERT INTO User_Messages( SenderID, Sender, ReceiverID, Receiver, Title, Content, SendTime, IsRead, IsDelR, IfDelS, IsDelete, Annex1, Annex2, Gold, Money, IsExist,Type,Remark,ValidDate,Annex1Name,Annex2Name,Annex3,Annex4,Annex5,Annex3Name,Annex4Name,Annex5Name,AnnexRemark) 
 select  0, '系统管理员', UserID, '', '物品返回', '物品返回', getdate(), 0, 0, 0, 0, ItemID, '', 0, 0, 1,51,'Gold:0,Money:0,Annex1:'+cast(ItemID as nvarchar(20))+',Annex2:,Annex3:,Annex4:,Annex5:',10,'','','','','','','','','' from Sys_users_Goods where BagType=0 and place>=80

  if @@error<>0
  begin  
    rollback tran
    return @@error
  end

Update Sys_users_Goods set place=-1 where BagType=0 and place>=80

  if @@error<>0
  begin  
    rollback tran
    return @@error
  end

select 'finish'

commit tran
set xact_abort off


return 0









GO
