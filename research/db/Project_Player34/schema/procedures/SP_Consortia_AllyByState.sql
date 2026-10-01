-- SQL_STORED_PROCEDURE dbo.SP_Consortia_AllyByState (modified 2021-06-04T05:18:34.877)



-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<公会信息：公会关系(中立、同盟、敌对)申请>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Consortia_AllyByState]
@ConsortiaID int,
@State int
 AS  
   begin 
     select Consortia2ID from Consortia_Apply_Ally where IsExist=1 and Consortia1ID=@ConsortiaID and State=@State
   end








GO
