-- SQL_STORED_PROCEDURE dbo.SP_Charge_To_User (modified 2021-06-04T05:18:34.810)




-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<充值信息：将订单充值信息转入玩家帐号中>
-- =============================================
CREATE Procedure [dbo].[SP_Charge_To_User]
@UserName Nvarchar(200),
@money int out,
@NickName nvarchar(200)
as 

select @money= isnull(sum(Money),0) from Charge_Money  
where UserName = @UserName and CanUse=1 and (NickName=@NickName or NickName is null or NickName='')

if @money=0
begin
  return 0
end

set xact_abort on
begin tran 

update Charge_Money set CanUse=0 where  UserName = @UserName and CanUse=1 and (NickName=@NickName or NickName is null or NickName='')

if @@error<>0
begin
  rollback tran
  return @@error
end

Update Sys_Users_Detail set Money=Money + @money where UserName = @UserName and NickName=@NickName

if @@error<>0
begin
  rollback tran
  return @@error
end

commit tran
set xact_abort off

return 0







GO
