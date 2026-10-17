-- SQL_STORED_PROCEDURE dbo.SP_VIPRenewal_Single (modified 2015-01-25T14:04:48.820)
-- =============================================
-- Author:		<Author,,Name>
-- Create date: <Create Date,,>
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE [dbo].[SP_VIPRenewal_Single]
@NickName Nvarchar(200),
@RenewalDays int ,
@ExpireDayOut datetime out

AS
declare  @UserID int
declare  @ExpireDay datetime
declare  @Exp int
select @UserID = [UserID], @ExpireDay = [VIPExpireDay], @Exp = [VIPExp] from V_Sys_Users_Detail
where NickName=@NickName and IsExist = 1
	if @ExpireDay<getdate() or @ExpireDay=getdate() 
       begin
    	set @ExpireDay=getdate() + @RenewalDays
       end
     else
       begin
		set @ExpireDay=@ExpireDay + @RenewalDays
       end
       set @ExpireDayOut = @ExpireDay
update [Sys_VIP_Info] set 
	   [typeVIP] = 1
      ,[VIPLevel] = 1
      ,[VIPExp] = @Exp
      ,[VIPExpireDay] = @ExpireDay
      ,[LastVIPPackTime] = GETDATE()
      ,[CanTakeVipReward] = 1
      where [UserID] = @UserID

return 1

GO
