-- SQL_STORED_PROCEDURE dbo.SP_Charge_Money_UserId_Add (modified 2021-06-04T05:18:34.790)






-- =============================================
-- Author:		<XiaoV>
-- ALTER  date: <2009-10-22>
-- Description:	<用户充值:给用户充值>
-- =============================================
CREATE  Procedure [dbo].[SP_Charge_Money_UserId_Add]
@ChargeID varchar(50),
@UserName Nvarchar(200),
@Money int,
@Date Nvarchar(50),
@PayWay Nvarchar(200),
@NeedMoney decimal(9,2),
@UserID int output,
@IP nvarchar(50),
@SourceUserID int
as 
Declare @NickName Nvarchar(200)
Select @UserID=isnull(UserID,0),@NickName=NickName from Sys_Users_Detail where UserName=@UserName And Userid=@SourceUserID
if @UserID = 0
begin 
  return 2
end

declare @count int
select @count=count(*) from Charge_Money where ChargeID=@ChargeID
if @count > 0
begin 
  return 4
end

set xact_abort on 
begin tran

insert into Charge_Money(ChargeID,UserName,[Money],[Date],CanUse,PayWay,NeedMoney,IP,NickName)
       values(@ChargeID,@UserName,@Money,@Date,1,@PayWay,@NeedMoney,@IP,@NickName)

if @@Error <> 0 
begin 
 rollback tran
 return 1
end

update Sys_Users_Detail set ChargeDate = getdate() where UserID=@UserID

if @@Error <> 0 
begin 
 rollback tran
 return 1
end

commit tran
set xact_abort off

return 0








GO
