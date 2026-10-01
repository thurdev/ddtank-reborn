-- SQL_STORED_PROCEDURE dbo.SP_UserTexp_Add (modified 2021-06-04T05:18:36.597)






-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<拍卖行：用户发布一个商品信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_UserTexp_Add]   
	@UserID int ,
	@spdTexpExp int ,
	@attTexpExp int ,
	@defTexpExp int ,
	@hpTexpExp int ,
	@lukTexpExp int ,
	@texpTaskCount int ,
	@texpCount int ,
	@texpTaskDate datetime
AS  
declare @count int
select @count=count(*) from Sys_Users_Texp where UserID=@UserID

if @count >0
begin
    return 1
end

set xact_abort on
begin tran

INSERT INTO [dbo].[Sys_Users_Texp]
           ([UserID]
           ,[spdTexpExp]
           ,[attTexpExp]
           ,[defTexpExp]
           ,[hpTexpExp]
           ,[lukTexpExp]
           ,[texpTaskCount]
           ,[texpCount]
           ,[texpTaskDate])
     VALUES
           (@UserID
           ,@spdTexpExp
           ,@attTexpExp
           ,@defTexpExp
           ,@hpTexpExp
           ,@lukTexpExp
           ,@texpTaskCount
           ,@texpCount
           ,@texpTaskDate)
if @@error<>0
begin
  rollback tran
  return @@error
end

commit tran
set xact_abort off

return 0










GO
