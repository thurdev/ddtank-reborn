-- SQL_STORED_PROCEDURE dbo.SP_Mail_Send (modified 2021-06-04T05:18:35.577)



-- =============================================
-- Author:		<Ken>
-- ALTER  date: <2009-10-22>
-- Description:	<邮件信息：用户发送一封邮件>
-- =============================================
CREATE  PROCEDURE [dbo].[SP_Mail_Send]   
 @ID int output, 
 @SenderID int, 
 @Sender nvarchar(100), 
 @ReceiverID int, 
 @Receiver nvarchar(100), 
 @Title nvarchar(1000), 
 @Content nvarchar(4000), 
 @SendTime DateTime, 
 @IsRead bit, 
 @IsDelR bit, 
 @IfDelS bit, 
 @IsDelete bit, 
 @Annex1 nvarchar(100), 
 @Annex2 nvarchar(100), 
 @Gold int, 
 @Money int, 
 @IsExist bit,
 @Type int,
 @Annex1Name nvarchar(100), 
 @Annex2Name nvarchar(100),
 @Annex3 nvarchar(100), 
 @Annex4 nvarchar(100), 
 @Annex5 nvarchar(100), 
 @Annex3Name nvarchar(100), 
 @Annex4Name nvarchar(100),
 @Annex5Name nvarchar(100),
 @ValidDate int,
 @AnnexRemark nvarchar(200),
 @GiftToken int
AS  

   begin 
     
     --declare @ValidDate int 
     declare @Remark nvarchar(100)
     set @Remark = 'Gold:'+cast(@Gold as varchar(20))+',Money:'+cast(@Money as varchar(20))+',Annex1:'+@Annex1+',Annex2:'+@Annex2+',Annex3:'+@Annex3+',Annex4:'+@Annex4+',Annex5:'+@Annex5+',GiftToken:'+cast(@GiftToken as varchar(20))
     if @Type>100 
       begin
          set @ValidDate=@ValidDate
       end
      else
       begin
         set @ValidDate=10*24
       end


     INSERT INTO User_Messages( SenderID, Sender, ReceiverID, Receiver, Title, Content, SendTime, IsRead, IsDelR, IfDelS, IsDelete, Annex1, Annex2, Gold, Money, IsExist,Type,Remark,ValidDate,Annex1Name,Annex2Name,Annex3,Annex4,Annex5,Annex3Name,Annex4Name,Annex5Name,AnnexRemark,GiftToken) 
     VALUES( @SenderID, @Sender, @ReceiverID, @Receiver, @Title, @Content, @SendTime, @IsRead, @IsDelR, @IfDelS, @IsDelete, @Annex1, @Annex2, @Gold, @Money, @IsExist,@Type,@Remark,@ValidDate,@Annex1Name,@Annex2Name,@Annex3,@Annex4,@Annex5,@Annex3Name,@Annex4Name,@Annex5Name,@AnnexRemark,@GiftToken)
     select @@identity as 'identity'
     set @ID=@@identity    
 end







GO
