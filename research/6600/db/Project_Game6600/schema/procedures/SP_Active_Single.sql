-- SQL_STORED_PROCEDURE dbo.SP_Active_Single (modified 2015-01-25T14:04:48.453)
-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<读取一条活动记录>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Active_Single]
@ID int
AS  
 select * from Active where ActiveID =@ID

GO
