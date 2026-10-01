-- SQL_STORED_PROCEDURE dbo.SP_User_Update_BoxProgression (modified 2021-06-04T05:18:35.977)







-- =============================================
-- Author:		<bTh>
-- ALTER  date: <2017-17-11>
-- Description:	<拍卖行：用户发布一个商品信息>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_User_Update_BoxProgression] 
@UserID int,
@BoxProgression int,
@GetBoxLevel int,
@AddGPLastDate datetime,
@BoxGetDate datetime,
@AlreadyGetBox int
AS  
UPDATE [dbo].[Sys_Users_Detail]
   SET [BoxProgression] = @BoxProgression
      ,[GetBoxLevel] = @GetBoxLevel
      ,[BoxGetDate] = @BoxGetDate
	  ,[AlreadyGetBox] = @AlreadyGetBox
 WHERE [UserID] =@UserID 
 return 1







GO
