-- SQL_STORED_PROCEDURE dbo.SP_Sys_Clear_Messages (modified 2021-06-04T05:18:35.733)





-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<过期信息：清除用户删除邮件>
-- =============================================
CREATE Procedure [dbo].[SP_Sys_Clear_Messages]
as
declare @date datetime
set @date=dateadd(day,-20,getdate())
select @date

--set xact_abort on 
--begin tran 

--delete Sys_Users_Goods where ItemID in (select cast(Annex1 as int) from User_Messages where dateadd(day,21,SendTime)<getdate() and (Type<100 or [Money]=0))
delete Sys_Users_Goods where ItemID in (select cast(Annex1 as int) from User_Messages where SendTime<@date  and (Type<100 or [Money]=0))

--if @@error <>0
--begin 
--  rollback tran
--  return @@error
--end

--delete Sys_Users_Goods where ItemID in (select cast(Annex2 as int) from User_Messages where dateadd(day,21,SendTime)<getdate() and (Type<100 or [Money]=0))
delete Sys_Users_Goods where ItemID in (select cast(Annex2 as int) from User_Messages where SendTime<@date and (Type<100 or [Money]=0))

--if(@@error <>0)
--begin 
--  rollback tran
--  return @@error
--end

--delete User_Messages where dateadd(day,21,SendTime)<getdate()
delete User_Messages where SendTime<@date

--if @@error<>0
--begin
--  rollback tran
--  return @@error
--end

--commit tran
--set xact_abort off
return 0








GO
