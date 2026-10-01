-- SQL_STORED_PROCEDURE dbo.SP_UserLeague_Update (modified 2022-05-09T05:56:35.150)



-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<拍卖行：用户发布一个商品信息>
-- =============================================
CREATE  PROCEDURE [dbo].SP_UserLeague_Update  
	@ID int, 
	@UserID int,
	@RankID int,
	@Point int,
	@Win int,
	@Lose int,
	@IsBanned bit,
	@ForbidDate DateTime,
	@ForbidReason nvarchar(500)	
AS  
begin

UPDATE [dbo].[Sys_Users_League]
   SET [UserID] = @UserID
      ,[RankID] = @RankID
      ,[Point] = @Point
      ,[Win] = @Win
      ,[Lose] = @Lose
      ,[IsBanned] = @IsBanned
      ,[ForbidDate] = @ForbidDate
      ,[ForbidReason] = @ForbidReason
 WHERE [ID] = @ID and [UserID] =@UserID 
 return 0
 end
 
if(@@error <> 0)
begin
  return 1 ---Return false insert error
end






GO
