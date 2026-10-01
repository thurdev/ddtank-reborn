-- SQL_STORED_PROCEDURE dbo.SP_VIPRenewal_Single (modified 2021-06-04T05:18:36.613)





-- =============================================
-- Author:		<Author,,Name>
-- Create date: <Create Date,,>
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE [dbo].[SP_VIPRenewal_Single]
@NickName Nvarchar(200),
@RenewalDays int,
@ExpireDayOut datetime out,
@typeVIP int

AS
declare @UserID int
declare @ExpireDay datetime
declare @Exp int
declare @Level int

select @UserID = [UserID], @ExpireDay = [VIPExpireDay], @Level = [VIPLevel], @Exp = [VIPExp] from V_Sys_Users_Detail
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
	   [typeVIP] = @typeVIP
      ,[VIPLevel] = @Level
      ,[VIPExp] = @Exp
      ,[VIPExpireDay] = @ExpireDay
      ,[LastVIPPackTime] = GETDATE()
      ,[CanTakeVipReward] = 1
      where [UserID] = @UserID

return 1










GO
