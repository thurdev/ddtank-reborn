-- SQL_STORED_PROCEDURE dbo.SP_LuckStar_Rank_Info_Add (modified 2015-01-25T14:04:48.577)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<用户信息：插入用户buff(防踢、双倍经验、双倍功勋)信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_LuckStar_Rank_Info_Add]   
			@UserID int
           ,@useStarNum int
           ,@nickName nvarchar (150)
           ,@isVip int
 
as
declare  @temp int
select @temp = count(*) from [dbo].[LuckStarRankInfo] where UserID=@UserID
if @temp=0 
   begin 
    INSERT INTO [dbo].[LuckStarRankInfo]
           ([UserID]
           ,[useStarNum]
           ,[nickName]
           ,[isVip])
     VALUES
           (@UserID
           ,@useStarNum
           ,@nickName
           ,@isVip)
 end 
 else
   begin   
    UPDATE [dbo].[LuckStarRankInfo]
   SET [useStarNum] = @useStarNum
      ,[nickName] = @nickName
      ,[isVip] = @isVip
 WHERE UserID=@UserID
   end

GO
